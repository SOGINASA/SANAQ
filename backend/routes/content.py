import uuid

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, jwt_required

from models import LearningModule, Lesson, Skill, Task, db
from utils.localization import localized
from utils.responses import api_error, success
from utils.decorators import roles_required


content_bp = Blueprint("content", __name__)
MAX_EDITOR_PAYLOAD_BYTES = 2 * 1024 * 1024


def task_payload(task, editor=False):
    skill = db.session.get(Skill, task.skill_id)
    payload = {
        "id": task.id,
        "lesson_id": task.lesson_id,
        "skill_id": task.skill_id,
        "skill_name": localized(skill.name),
        "prompt": localized(task.prompt),
        "task_type": task.task_type,
        "difficulty": task.difficulty,
        "options": [localized(option) for option in (task.options or [])],
    }
    if editor:
        payload.update({
            "acceptable_answers": task.acceptable_answers or [],
            "hint": localized(task.hint),
            "explanation": localized(task.explanation),
            "is_published": task.is_published,
        })
    return payload


def lesson_payload(lesson, include_content=True, editor=False):
    payload = {
        "id": lesson.id,
        "module_id": lesson.module_id,
        "title": localized(lesson.title),
        "order": lesson.order_index,
    }
    if include_content:
        task_query = db.select(Task).where(Task.lesson_id == lesson.id)
        if not editor:
            task_query = task_query.where(Task.is_published.is_(True))
        tasks = db.session.scalars(task_query.order_by(Task.difficulty)).all()
        payload.update({
            "theory": localized(lesson.theory),
            "example": localized(lesson.example),
            "tasks": [task_payload(task, editor=editor) for task in tasks],
        })
    return payload


def module_payload(module, include_lessons=False, include_content=False, editor=False):
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
        payload["lessons"] = [
            lesson_payload(lesson, include_content=include_content, editor=editor)
            for lesson in lessons
        ]
    return payload


def _localized_value(value):
    if isinstance(value, dict):
        return value
    text = str(value or "").strip()
    return {"ru": text, "kk": text, "en": text}


def _editor_task_values(data):
    return {
        "skill_id": str(data.get("skill_id", "")),
        "prompt": _localized_value(data.get("prompt", "")),
        "task_type": str(data.get("task_type", "single_choice")),
        "difficulty": int(data.get("difficulty", 1)),
        "options": data.get("options", []),
        "acceptable_answers": data.get("acceptable_answers", []),
        "hint": _localized_value(data.get("hint", "")),
        "explanation": _localized_value(data.get("explanation", "")),
        "is_published": bool(data.get("is_published", True)),
    }


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


@content_bp.put("/modules/<moduleId>/editor")
@roles_required("teacher", "admin")
def save_module_editor(moduleId):
    if request.content_length and request.content_length > MAX_EDITOR_PAYLOAD_BYTES:
        return api_error("CONTENT_TOO_LARGE", "Редактор принимает до 2 МБ данных", 413)
    module = db.session.get(LearningModule, moduleId)
    if not module:
        return api_error("MODULE_NOT_FOUND", "Модуль не найден", 404)
    data = request.get_json(silent=True) or {}
    try:
        expected_version = int(data.get("expected_version"))
    except (TypeError, ValueError):
        return api_error("VERSION_REQUIRED", "Укажите версию модуля", 422)
    if expected_version != module.version:
        return api_error("CONTENT_VERSION_CONFLICT", "Модуль уже изменён в другой вкладке", 409, [{
            "expected_version": expected_version, "current_version": module.version,
        }])

    lessons_data = data.get("lessons")
    if not str(data.get("title", "")).strip() or not isinstance(lessons_data, list) or not lessons_data:
        return api_error("VALIDATION_ERROR", "Заполните название и добавьте урок", 422)
    if any(not str(item.get("title", "")).strip() or not str(item.get("theory", "")).strip() for item in lessons_data):
        return api_error("VALIDATION_ERROR", "Заполните название и теорию каждого урока", 422)

    module.title = _localized_value(data["title"])
    module.description = _localized_value(data.get("description", ""))
    module.subject_id = str(data.get("subject_id", module.subject_id))
    module.topic_id = str(data.get("topic_id", module.topic_id))
    module.grade = int(data.get("grade", module.grade))

    existing_lessons = {item.id: item for item in db.session.scalars(
        db.select(Lesson).where(Lesson.module_id == module.id)
    ).all()}
    retained_lesson_ids = set()
    for lesson_index, lesson_data in enumerate(lessons_data, start=1):
        lesson_id = lesson_data.get("id")
        lesson = existing_lessons.get(lesson_id) if lesson_id else None
        if lesson_id and not lesson:
            return api_error("CONTENT_VERSION_CONFLICT", "Состав уроков уже изменён", 409)
        if not lesson:
            lesson = Lesson(id=f"lesson-{uuid.uuid4().hex[:12]}", module_id=module.id)
            db.session.add(lesson)
        lesson.title = _localized_value(lesson_data["title"])
        lesson.theory = _localized_value(lesson_data["theory"])
        lesson.example = _localized_value(lesson_data.get("example", ""))
        lesson.order_index = lesson_index
        retained_lesson_ids.add(lesson.id)

        existing_tasks = {item.id: item for item in db.session.scalars(
            db.select(Task).where(Task.lesson_id == lesson.id)
        ).all()} if lesson.id in existing_lessons else {}
        retained_task_ids = set()
        for task_data in lesson_data.get("tasks", []):
            task_id = task_data.get("id")
            task = existing_tasks.get(task_id) if task_id else None
            if task_id and not task:
                return api_error("CONTENT_VERSION_CONFLICT", "Состав заданий уже изменён", 409)
            if not task:
                task = Task(id=f"task-{uuid.uuid4().hex[:12]}", lesson_id=lesson.id)
                db.session.add(task)
            for field, value in _editor_task_values(task_data).items():
                setattr(task, field, value)
            retained_task_ids.add(task.id)
        for task_id, task in existing_tasks.items():
            if task_id not in retained_task_ids:
                db.session.delete(task)

    for lesson_id, lesson in existing_lessons.items():
        if lesson_id not in retained_lesson_ids:
            for task in db.session.scalars(db.select(Task).where(Task.lesson_id == lesson.id)).all():
                db.session.delete(task)
            db.session.delete(lesson)

    module.version += 1
    db.session.commit()
    return success({"module": module_payload(module, include_lessons=True, include_content=True, editor=True)})


@content_bp.delete("/modules/<moduleId>")
@roles_required("teacher", "admin")
def delete_module(moduleId):
    module = db.session.get(LearningModule, moduleId)
    if not module:
        return api_error("MODULE_NOT_FOUND", "Модуль не найден", 404)
    lessons = db.session.scalars(db.select(Lesson).where(Lesson.module_id == module.id)).all()
    for lesson in lessons:
        tasks = db.session.scalars(db.select(Task).where(Task.lesson_id == lesson.id)).all()
        for task in tasks:
            db.session.delete(task)
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
    if "order" in data:
        lesson.order_index = int(data["order"])
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
    for field in ("options", "acceptable_answers", "is_published", "difficulty", "task_type", "skill_id"):
        if field in data:
            setattr(task, field, data[field])
    db.session.commit()
    return success({"task": task_payload(task)})


@content_bp.delete("/tasks/<taskId>")
@roles_required("teacher", "admin")
def delete_task(taskId):
    task = db.session.get(Task, taskId)
    if not task:
        return api_error("TASK_NOT_FOUND", "Задание не найдено", 404)
    db.session.delete(task)
    db.session.commit()
    return success({"deleted": True})


@content_bp.delete("/lessons/<lessonId>")
@roles_required("teacher", "admin")
def delete_lesson(lessonId):
    lesson = db.session.get(Lesson, lessonId)
    if not lesson:
        return api_error("LESSON_NOT_FOUND", "Урок не найден", 404)
    tasks = db.session.scalars(db.select(Task).where(Task.lesson_id == lesson.id)).all()
    for task in tasks:
        db.session.delete(task)
    db.session.delete(lesson)
    db.session.commit()
    return success({"deleted": True})


@content_bp.get("/modules/<moduleId>")
@jwt_required(locations=["headers"])
def module_details(moduleId):
    module = db.session.get(LearningModule, moduleId)
    editor = get_jwt().get("role") in {"teacher", "admin"}
    if not module or (module.status != "published" and not editor):
        return api_error("MODULE_NOT_FOUND", "Модуль не найден", 404)
    return success({"module": module_payload(module, include_lessons=True, include_content=editor, editor=editor)})


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
