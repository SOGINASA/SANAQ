from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from models import KnowledgeState, LearningPath, LearningStep, Topic, db
from services.learning import (
    MASTERY_THRESHOLD,
    available_learning_skills,
    mastery_status,
    prerequisite_ids,
    serialize_step,
)
from utils.decorators import roles_required
from utils.localization import localized
from utils.responses import api_error, success


progress_bp = Blueprint("progress", __name__)


def _skills_and_states(subject_id):
    skills = available_learning_skills(subject_id)
    states = db.session.scalars(
        db.select(KnowledgeState).where(
            KnowledgeState.student_id == get_jwt_identity(),
            KnowledgeState.skill_id.in_([skill.id for skill in skills]),
        )
    ).all() if skills else []
    return skills, {state.skill_id: state for state in states}


@progress_bp.get("/students/me/progress/summary")
@roles_required("student")
def progress_summary():
    subject_id = request.args.get("subject_id", "mathematics")
    skills, state_by_skill = _skills_and_states(subject_id)
    if not skills:
        return api_error("SUBJECT_NOT_FOUND", "Предмет не найден", 404)
    mastery_values = [state_by_skill.get(skill.id).mastery if state_by_skill.get(skill.id) else 0 for skill in skills]
    path = db.session.scalar(
        db.select(LearningPath)
        .where(
            LearningPath.student_id == get_jwt_identity(),
            LearningPath.subject_id == subject_id,
            LearningPath.status == "active",
        )
        .order_by(LearningPath.created_at.desc())
    )
    next_step = None
    if path:
        next_step = db.session.scalar(
            db.select(LearningStep)
            .where(LearningStep.path_id == path.id, LearningStep.status == "available")
            .order_by(LearningStep.order_index)
        )
    return success({
        "subject_id": subject_id,
        "overall_mastery": round(sum(mastery_values) / len(mastery_values), 2),
        "mastered_skills": sum(value >= MASTERY_THRESHOLD for value in mastery_values),
        "total_skills": len(skills),
        "weak_skills": sum(value < MASTERY_THRESHOLD for value in mastery_values),
        "active_learning_path_id": path.id if path else None,
        "daily_step": serialize_step(next_step) if next_step else None,
    })


@progress_bp.get("/students/me/progress/topics")
@roles_required("student")
def progress_topics():
    subject_id = request.args.get("subject_id", "mathematics")
    skills, state_by_skill = _skills_and_states(subject_id)
    topics = db.session.scalars(
        db.select(Topic).where(Topic.subject_id == subject_id).order_by(Topic.order_index)
    ).all()
    items = []
    for topic in topics:
        topic_skills = [skill for skill in skills if skill.topic_id == topic.id]
        values = [state_by_skill.get(skill.id).mastery if state_by_skill.get(skill.id) else 0 for skill in topic_skills]
        items.append({
            "topic_id": topic.id,
            "name": localized(topic.name),
            "mastery": round(sum(values) / len(values), 2) if values else 0,
            "mastered_skills": sum(value >= MASTERY_THRESHOLD for value in values),
            "total_skills": len(values),
        })
    return success({"items": items})


@progress_bp.get("/students/me/weak-skills")
@roles_required("student")
def weak_skills():
    subject_id = request.args.get("subject_id", "mathematics")
    skills, state_by_skill = _skills_and_states(subject_id)
    items = []
    for skill in skills:
        state = state_by_skill.get(skill.id)
        mastery = state.mastery if state else 0
        if mastery >= MASTERY_THRESHOLD:
            continue
        items.append({
            "skill_id": skill.id,
            "name": localized(skill.name),
            "mastery": round(mastery, 2),
            "status": mastery_status(mastery, state.next_review_at if state else None),
            "reason": "Навык ограничивает продвижение к следующим темам и имеет низкий mastery.",
            "source_skill_ids": prerequisite_ids(skill.id) or [skill.id],
            "confidence": round(state.confidence, 2) if state else 0.5,
            "algorithm_version": "prerequisite-gap-v1",
        })
    items.sort(key=lambda item: item["mastery"])
    return success({"items": items})
