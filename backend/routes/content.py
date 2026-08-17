from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from models import LearningModule, Lesson, Skill, Task, db
from utils.localization import localized
from utils.responses import api_error, success


content_bp = Blueprint("content", __name__)


def task_payload(task):
    skill = db.session.get(Skill, task.skill_id)
    return {
        "id": task.id,
        "lesson_id": task.lesson_id,
        "skill_id": task.skill_id,
        "skill_name": localized(skill.name),
        "prompt": localized(task.prompt),
        "task_type": task.task_type,
        "difficulty": task.difficulty,
        "options": task.options or [],
    }


def lesson_payload(lesson, include_content=True):
    payload = {
        "id": lesson.id,
        "module_id": lesson.module_id,
        "title": localized(lesson.title),
        "order": lesson.order_index,
    }
    if include_content:
        tasks = db.session.scalars(
            db.select(Task)
            .where(Task.lesson_id == lesson.id, Task.is_published.is_(True))
            .order_by(Task.difficulty)
        ).all()
        payload.update({
            "theory": localized(lesson.theory),
            "example": localized(lesson.example),
            "tasks": [task_payload(task) for task in tasks],
        })
    return payload


def module_payload(module, include_lessons=False):
    payload = {
        "id": module.id,
        "subject_id": module.subject_id,
        "topic_id": module.topic_id,
        "title": localized(module.title),
        "description": localized(module.description),
        "grade": module.grade,
        "status": module.status,
        "version": module.version,
    }
    if include_lessons:
        lessons = db.session.scalars(
            db.select(Lesson)
            .where(Lesson.module_id == module.id)
            .order_by(Lesson.order_index)
        ).all()
        payload["lessons"] = [lesson_payload(lesson, include_content=False) for lesson in lessons]
    return payload


@content_bp.get("/modules")
@jwt_required(locations=["headers"])
def modules():
    query = db.select(LearningModule).where(LearningModule.status == "published")
    if request.args.get("subject_id"):
        query = query.where(LearningModule.subject_id == request.args["subject_id"])
    if request.args.get("topic_id"):
        query = query.where(LearningModule.topic_id == request.args["topic_id"])
    if request.args.get("grade"):
        try:
            query = query.where(LearningModule.grade == int(request.args["grade"]))
        except ValueError:
            return api_error("VALIDATION_ERROR", "grade должен быть числом", 422)
    items = db.session.scalars(query.order_by(LearningModule.id)).all()
    return success({"items": [module_payload(module) for module in items]})


@content_bp.get("/modules/<moduleId>")
@jwt_required(locations=["headers"])
def module_details(moduleId):
    module = db.session.get(LearningModule, moduleId)
    if not module or module.status != "published":
        return api_error("MODULE_NOT_FOUND", "Модуль не найден", 404)
    return success({"module": module_payload(module, include_lessons=True)})


@content_bp.get("/lessons/<lessonId>")
@jwt_required(locations=["headers"])
def lesson_details(lessonId):
    lesson = db.session.get(Lesson, lessonId)
    if not lesson:
        return api_error("LESSON_NOT_FOUND", "Урок не найден", 404)
    return success({"lesson": lesson_payload(lesson)})


@content_bp.get("/tasks/<taskId>")
@jwt_required(locations=["headers"])
def task_details(taskId):
    task = db.session.get(Task, taskId)
    if not task or not task.is_published:
        return api_error("TASK_NOT_FOUND", "Задание не найдено", 404)
    return success({"task": task_payload(task)})

