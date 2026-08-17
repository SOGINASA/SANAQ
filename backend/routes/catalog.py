from flask import Blueprint
from flask_jwt_extended import jwt_required

from models import PrerequisiteEdge, Skill, Subject, Topic, db
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
    topic_rows = db.session.scalars(
        db.select(Topic).where(Topic.subject_id == subjectId).order_by(Topic.order_index)
    ).all()
    items = []
    for topic in topic_rows:
        skills = db.session.scalars(
            db.select(Skill).where(Skill.topic_id == topic.id).order_by(Skill.order_index)
        ).all()
        skill_ids = [skill.id for skill in skills]
        prerequisite_ids = list(db.session.scalars(
            db.select(PrerequisiteEdge.prerequisite_skill_id).where(
                PrerequisiteEdge.skill_id.in_(skill_ids)
            )
        ).all()) if skill_ids else []
        items.append({
            "id": topic.id,
            "name": localized(topic.name),
            "grade": topic.grade,
            "prerequisite_skill_ids": list(dict.fromkeys(prerequisite_ids)),
            "skills": [
                {"id": skill.id, "name": localized(skill.name)} for skill in skills
            ],
        })
    return success({"items": items})


@catalog_bp.get("/catalog/goals")
def goals():
    return success({"items": GOALS})


@catalog_bp.get("/catalog/locales")
def locales():
    return success({"items": [
        {"id": "ru", "name": "Русский"},
        {"id": "kk", "name": "Қазақша"},
    ]})
