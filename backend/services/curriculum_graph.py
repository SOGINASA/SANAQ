from datetime import datetime, timezone

from models import (
    KnowledgeState,
    PrerequisiteEdge,
    Skill,
    SkillPlanningMetadata,
    Topic,
    db,
)
from services.learning import MASTERY_THRESHOLD
from utils.localization import localized


def load_curriculum_graph(subject_id, target_grade=None):
    rows = db.session.execute(
        db.select(Skill, SkillPlanningMetadata, Topic)
        .join(SkillPlanningMetadata, SkillPlanningMetadata.skill_id == Skill.id)
        .join(Topic, Skill.topic_id == Topic.id)
        .where(Topic.subject_id == subject_id)
        .order_by(Topic.grade, Topic.order_index, Skill.order_index)
    ).all()
    all_skill_ids = {skill.id for skill, _, _ in rows}
    all_edges = db.session.scalars(
        db.select(PrerequisiteEdge).where(
            PrerequisiteEdge.skill_id.in_(all_skill_ids),
            PrerequisiteEdge.prerequisite_skill_id.in_(all_skill_ids),
        ).order_by(
            PrerequisiteEdge.skill_id,
            PrerequisiteEdge.prerequisite_skill_id,
        )
    ).all() if all_skill_ids else []

    included_ids = {
        skill.id for skill, metadata, _ in rows
        if target_grade is None or metadata.grade == target_grade
    }
    if target_grade is not None:
        prerequisites_by_skill = {}
        for edge in all_edges:
            prerequisites_by_skill.setdefault(edge.skill_id, set()).add(
                edge.prerequisite_skill_id
            )
        pending = list(included_ids)
        while pending:
            skill_id = pending.pop()
            for prerequisite_id in prerequisites_by_skill.get(skill_id, set()):
                if prerequisite_id not in included_ids:
                    included_ids.add(prerequisite_id)
                    pending.append(prerequisite_id)

    nodes = [
        {
            "id": skill.id,
            "name": skill.name,
            "topic_id": topic.id,
            "topic_name": topic.name,
            "grade": metadata.grade,
            "learning_minutes": metadata.learning_minutes,
            "practice_minutes": metadata.practice_minutes,
            "difficulty": metadata.difficulty,
            "importance": metadata.importance,
            "is_target_grade": target_grade is None or metadata.grade == target_grade,
        }
        for skill, metadata, topic in rows
        if skill.id in included_ids
    ]
    edges = [
        {"from": edge.prerequisite_skill_id, "to": edge.skill_id}
        for edge in all_edges
        if edge.skill_id in included_ids and edge.prerequisite_skill_id in included_ids
    ]
    return {"nodes": nodes, "edges": edges}


def serialize_curriculum_graph(subject_id, target_grade=None):
    graph = load_curriculum_graph(subject_id, target_grade)
    nodes = [
        {
            **node,
            "name": localized(node["name"]),
            "topic_name": localized(node["topic_name"]),
        }
        for node in graph["nodes"]
    ]
    return {
        "subject_id": subject_id,
        "target_grade": target_grade,
        "nodes": nodes,
        "edges": graph["edges"],
        "target_node_count": sum(node["is_target_grade"] for node in nodes),
        "foundation_node_count": sum(not node["is_target_grade"] for node in nodes),
    }


def _review_is_due(state):
    if not state or not state.next_review_at:
        return False
    review_at = state.next_review_at
    if review_at.tzinfo is None:
        review_at = review_at.replace(tzinfo=timezone.utc)
    return review_at <= datetime.now(timezone.utc)


def build_student_curriculum_state(student_id, subject_id, target_grade):
    graph = load_curriculum_graph(subject_id, target_grade)
    node_ids = [node["id"] for node in graph["nodes"]]
    states = db.session.scalars(
        db.select(KnowledgeState).where(
            KnowledgeState.student_id == student_id,
            KnowledgeState.skill_id.in_(node_ids),
        )
    ).all() if node_ids else []
    state_by_skill = {state.skill_id: state for state in states}
    prerequisites_by_skill = {}
    for edge in graph["edges"]:
        prerequisites_by_skill.setdefault(edge["to"], []).append(edge["from"])

    items = []
    for node in graph["nodes"]:
        state = state_by_skill.get(node["id"])
        mastery = state.mastery if state else 0.0
        blocked_by = sorted([
            prerequisite_id
            for prerequisite_id in prerequisites_by_skill.get(node["id"], [])
            if (
                not state_by_skill.get(prerequisite_id)
                or state_by_skill[prerequisite_id].mastery < MASTERY_THRESHOLD
            )
        ])
        if _review_is_due(state):
            status = "review_due"
        elif mastery >= MASTERY_THRESHOLD:
            status = "mastered"
        elif blocked_by:
            status = "blocked"
        elif state and mastery >= 0.45:
            status = "learning"
        elif state:
            status = "gap"
        else:
            status = "ready"

        status_priority = {
            "review_due": 0.90,
            "gap": 0.82,
            "learning": 0.70,
            "ready": 0.58,
            "blocked": 0.10,
            "mastered": 0.0,
        }[status]
        priority_score = min(
            1.0,
            status_priority + node["importance"] * 0.07 + node["difficulty"] * 0.03,
        )
        items.append({
            **node,
            "name": localized(node["name"]),
            "topic_name": localized(node["topic_name"]),
            "mastery": round(mastery, 2),
            "confidence": round(state.confidence, 2) if state else 0.0,
            "status": status,
            "blocked_by": blocked_by,
            "priority_score": round(priority_score, 3),
            "last_seen_at": state.last_seen_at.isoformat() if state and state.last_seen_at else None,
            "next_review_at": state.next_review_at.isoformat() if state and state.next_review_at else None,
        })

    counts = {
        status: sum(item["status"] == status for item in items)
        for status in ("ready", "blocked", "learning", "gap", "mastered", "review_due")
    }
    recommended = sorted(
        (
            item for item in items
            if item["status"] in {"review_due", "gap", "learning", "ready"}
        ),
        key=lambda item: (-item["priority_score"], item["grade"], item["id"]),
    )[:5]
    return {
        "subject_id": subject_id,
        "target_grade": target_grade,
        "summary": {"total": len(items), **counts},
        "recommended_skill_ids": [item["id"] for item in recommended],
        "items": items,
        "edges": graph["edges"],
    }
