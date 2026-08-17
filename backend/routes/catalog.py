from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from models import (
    CurriculumTopicMetadata,
    PrerequisiteEdge,
    Skill,
    SkillPlanningMetadata,
    Subject,
    Topic,
    db,
)
from utils.localization import localized
from utils.responses import api_error, success


catalog_bp = Blueprint("catalog", __name__)

GOALS = [
    {"id": "exam", "name": {"ru": "Подготовка к экзамену", "kk": "Емтиханға дайындық"}},
    {"id": "olympiad", "name": {"ru": "Подготовка к олимпиаде", "kk": "Олимпиадаға дайындық"}},
    {"id": "review", "name": {"ru": "Повторение темы", "kk": "Тақырыпты қайталау"}},
]


@catalog_bp.get("/catalog/grades")
def grades():
    return success({"items": list(range(7, 13))})


@catalog_bp.get("/catalog/subjects")
def subjects():
    items = db.session.scalars(db.select(Subject).order_by(Subject.id)).all()
    return success({"items": [
        {"id": subject.id, "name": localized(subject.name), "grades": subject.grades}
        for subject in items
    ]})


@catalog_bp.get("/catalog/subjects/<subjectId>/topics")
@jwt_required(locations=["headers"])
def topics(subjectId):
    if not db.session.get(Subject, subjectId):
        return api_error("SUBJECT_NOT_FOUND", "Предмет не найден", 404)
    grade = request.args.get("grade", type=int)
    if request.args.get("grade") is not None and grade not in range(7, 13):
        return api_error("VALIDATION_ERROR", "Допустимы классы с 7 по 12", 422)
    statement = (
        db.select(Topic, CurriculumTopicMetadata)
        .join(CurriculumTopicMetadata, CurriculumTopicMetadata.topic_id == Topic.id)
        .where(Topic.subject_id == subjectId)
        .order_by(Topic.grade, Topic.order_index)
    )
    if grade is not None:
        statement = statement.where(Topic.grade == grade)
    topic_rows = db.session.execute(statement).all()
    items = []
    for topic, topic_metadata in topic_rows:
        skills = db.session.scalars(
            db.select(Skill).where(Skill.topic_id == topic.id).order_by(Skill.order_index)
        ).all()
        skill_ids = [skill.id for skill in skills]
        planning_by_skill = {
            metadata.skill_id: metadata
            for metadata in db.session.scalars(
                db.select(SkillPlanningMetadata).where(
                    SkillPlanningMetadata.skill_id.in_(skill_ids)
                )
            ).all()
        } if skill_ids else {}
        prerequisite_ids = list(db.session.scalars(
            db.select(PrerequisiteEdge.prerequisite_skill_id).where(
                PrerequisiteEdge.skill_id.in_(skill_ids)
            )
        ).all()) if skill_ids else []
        items.append({
            "id": topic.id,
            "name": localized(topic.name),
            "grade": topic.grade,
            "strand": topic_metadata.strand,
            "curriculum_version": topic_metadata.curriculum_version,
            "source_scope": topic_metadata.source_scope,
            "estimated_total_minutes": topic_metadata.estimated_total_minutes,
            "prerequisite_skill_ids": list(dict.fromkeys(prerequisite_ids)),
            "skills": [
                {
                    "id": skill.id,
                    "name": localized(skill.name),
                    "learning_minutes": planning_by_skill[skill.id].learning_minutes,
                    "practice_minutes": planning_by_skill[skill.id].practice_minutes,
                    "difficulty": planning_by_skill[skill.id].difficulty,
                    "importance": planning_by_skill[skill.id].importance,
                }
                for skill in skills
            ],
        })
    return success({"items": items})


@catalog_bp.get("/catalog/subjects/<subjectId>/knowledge-graph")
@jwt_required(locations=["headers"])
def knowledge_graph(subjectId):
    if not db.session.get(Subject, subjectId):
        return api_error("SUBJECT_NOT_FOUND", "Предмет не найден", 404)
    grade = request.args.get("grade", type=int)
    if request.args.get("grade") is not None and grade not in range(7, 13):
        return api_error("VALIDATION_ERROR", "Допустимы классы с 7 по 12", 422)

    rows = db.session.execute(
        db.select(Skill, SkillPlanningMetadata, Topic)
        .join(SkillPlanningMetadata, SkillPlanningMetadata.skill_id == Skill.id)
        .join(Topic, Skill.topic_id == Topic.id)
        .where(Topic.subject_id == subjectId)
        .order_by(Topic.grade, Topic.order_index, Skill.order_index)
    ).all()
    all_skill_ids = {skill.id for skill, _, _ in rows}
    all_edges = db.session.scalars(
        db.select(PrerequisiteEdge).where(
            PrerequisiteEdge.skill_id.in_(all_skill_ids),
            PrerequisiteEdge.prerequisite_skill_id.in_(all_skill_ids),
        )
    ).all() if all_skill_ids else []

    included_ids = {
        skill.id for skill, metadata, _ in rows
        if grade is None or metadata.grade == grade
    }
    if grade is not None:
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
            "name": localized(skill.name),
            "topic_id": topic.id,
            "topic_name": localized(topic.name),
            "grade": metadata.grade,
            "learning_minutes": metadata.learning_minutes,
            "practice_minutes": metadata.practice_minutes,
            "difficulty": metadata.difficulty,
            "importance": metadata.importance,
            "is_target_grade": grade is None or metadata.grade == grade,
        }
        for skill, metadata, topic in rows
        if skill.id in included_ids
    ]
    edges = [
        {"from": edge.prerequisite_skill_id, "to": edge.skill_id}
        for edge in all_edges
        if edge.skill_id in included_ids and edge.prerequisite_skill_id in included_ids
    ]
    return success({
        "subject_id": subjectId,
        "target_grade": grade,
        "nodes": nodes,
        "edges": edges,
        "target_node_count": sum(node["is_target_grade"] for node in nodes),
        "foundation_node_count": sum(not node["is_target_grade"] for node in nodes),
    })


@catalog_bp.get("/catalog/goals")
def goals():
    return success({"items": GOALS})


@catalog_bp.get("/catalog/locales")
def locales():
    return success({"items": [
        {"id": "ru", "name": "Русский"},
        {"id": "kk", "name": "Қазақша"},
    ]})
