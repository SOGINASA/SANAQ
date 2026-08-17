import uuid

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, jwt_required

from models import LearningModule, Lesson, Skill, Task, db
from utils.localization import localized
from utils.responses import api_error, success
from utils.decorators import roles_required


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


def _localized_value(value):
    if isinstance(value, dict):
        return value
    text = str(value or "").strip()
    return {"ru": text, "kk": text}


@content_bp.get("/modules")
@jwt_required(locations=["headers"])
def modules():
    query = db.select(LearningModule)
    if get_jwt().get("role") not in {"teacher", "admin"}:
        query = query.where(LearningModule.status == "published")
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


@content_bp.post("/modules")
@roles_required("teacher", "admin")
def create_module():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    topic_id = str(data.get("topic_id", "")).strip()
    subject_id = str(data.get("subject_id", "mathematics"))
    try:
        grade = int(data.get("grade", 9))
    except (TypeError, ValueError):
        return api_error("VALIDATION_ERROR", "Класс должен быть числом", 422)
    if not title or not topic_id:
        return api_error("VALIDATION_ERROR", "Укажите название и тему", 422)
    module = LearningModule(
        id=f"module-{uuid.uuid4().hex[:12]}", subject_id=subject_id, topic_id=topic_id,
        title=_localized_value(title), description=_localized_value(data.get("description", "")),
        grade=grade, status="draft", version=1,
    )
    lesson = Lesson(
        id=f"lesson-{uuid.uuid4().hex[:12]}", module_id=module.id,
        title=_localized_value(data.get("lesson_title") or title),
        theory=_localized_value(data.get("theory", "")),
        example=_localized_value(data.get("example", "")), order_index=1,
    )
    db.session.add_all([module, lesson])
    db.session.commit()
    return success({"module": module_payload(module, include_lessons=True)}, status=201)


@content_bp.patch("/modules/<moduleId>")
@roles_required("teacher", "admin")
def update_module(moduleId):
    module = db.session.get(LearningModule, moduleId)
    if not module:
        return api_error("MODULE_NOT_FOUND", "Модуль не найден", 404)
    data = request.get_json(silent=True) or {}
    for field in ("title", "description"):
        if field in data:
            setattr(module, field, _localized_value(data[field]))
    for field in ("grade", "topic_id", "subject_id"):
        if field in data:
            setattr(module, field, int(data[field]) if field == "grade" else str(data[field]))
    module.version += 1
    db.session.commit()
    return success({"module": module_payload(module, include_lessons=True)})


@content_bp.delete("/modules/<moduleId>")
@roles_required("teacher", "admin")
def delete_module(moduleId):
    module = db.session.get(LearningModule, moduleId)
    if not module:
        return api_error("MODULE_NOT_FOUND", "Модуль не найден", 404)
    has_tasks = db.session.scalar(
        db.select(db.func.count()).select_from(Task).join(Lesson, Task.lesson_id == Lesson.id)
        .where(Lesson.module_id == module.id)
    )
    if has_tasks:
        return api_error("MODULE_IN_USE", "Сначала удалите задания модуля", 409)
    lessons = db.session.scalars(db.select(Lesson).where(Lesson.module_id == module.id)).all()
    for lesson in lessons:
        db.session.delete(lesson)
    db.session.delete(module)
    db.session.commit()
    return success({"deleted": True})


@content_bp.post("/modules/<moduleId>/publish")
@roles_required("teacher", "admin")
def publish_module(moduleId):
    module = db.session.get(LearningModule, moduleId)
    if not module:
        return api_error("MODULE_NOT_FOUND", "Модуль не найден", 404)
    lesson = db.session.scalar(db.select(Lesson).where(Lesson.module_id == module.id))
    if not lesson or not localized(lesson.theory).strip():
        return api_error("CONTENT_INCOMPLETE", "Добавьте теорию перед публикацией", 409)
    module.status = "published"
    module.version += 1
    db.session.commit()
    return success({"module": module_payload(module, include_lessons=True)})


@content_bp.post("/lessons")
@roles_required("teacher", "admin")
def create_lesson():
    data = request.get_json(silent=True) or {}
    module = db.session.get(LearningModule, str(data.get("module_id", "")))
    if not module:
        return api_error("MODULE_NOT_FOUND", "Модуль не найден", 404)
    lesson = Lesson(
        id=f"lesson-{uuid.uuid4().hex[:12]}", module_id=module.id,
        title=_localized_value(data.get("title", "Новый урок")),
        theory=_localized_value(data.get("theory", "")), example=_localized_value(data.get("example", "")),
        order_index=int(data.get("order", 1)),
    )
    db.session.add(lesson)
    db.session.commit()
    return success({"lesson": lesson_payload(lesson)}, status=201)


@content_bp.patch("/lessons/<lessonId>")
@roles_required("teacher", "admin")
def update_lesson(lessonId):
    lesson = db.session.get(Lesson, lessonId)
    if not lesson:
        return api_error("LESSON_NOT_FOUND", "Урок не найден", 404)
    data = request.get_json(silent=True) or {}
    for field in ("title", "theory", "example"):
        if field in data:
            setattr(lesson, field, _localized_value(data[field]))
    db.session.commit()
    return success({"lesson": lesson_payload(lesson)})


@content_bp.post("/tasks")
@roles_required("teacher", "admin")
def create_task():
    data = request.get_json(silent=True) or {}
    if not db.session.get(Lesson, str(data.get("lesson_id", ""))):
        return api_error("LESSON_NOT_FOUND", "Урок не найден", 404)
    task = Task(
        id=f"task-{uuid.uuid4().hex[:12]}", lesson_id=str(data["lesson_id"]),
        skill_id=str(data.get("skill_id", "")), prompt=_localized_value(data.get("prompt", "")),
        task_type=str(data.get("task_type", "single_choice")), difficulty=int(data.get("difficulty", 1)),
        options=data.get("options", []), acceptable_answers=data.get("acceptable_answers", []),
        hint=_localized_value(data.get("hint", "")), explanation=_localized_value(data.get("explanation", "")),
        is_published=bool(data.get("is_published", False)),
    )
    db.session.add(task)
    db.session.commit()
    return success({"task": task_payload(task)}, status=201)


@content_bp.patch("/tasks/<taskId>")
@roles_required("teacher", "admin")
def update_task(taskId):
    task = db.session.get(Task, taskId)
    if not task:
        return api_error("TASK_NOT_FOUND", "Задание не найдено", 404)
    data = request.get_json(silent=True) or {}
    for field in ("prompt", "hint", "explanation"):
        if field in data:
            setattr(task, field, _localized_value(data[field]))
    for field in ("options", "acceptable_answers", "is_published", "difficulty"):
        if field in data:
            setattr(task, field, data[field])
    db.session.commit()
    return success({"task": task_payload(task)})


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
