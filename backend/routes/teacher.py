import secrets
from datetime import datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity

from models import (
    Assignment, Attempt, ClassAnnouncement, ClassEnrollment, Classroom, KnowledgeState, LearningModule, LearningPath,
    LearningStep, Notification, StudentProfile, Task, TeacherComment, User, db,
)
from services.learning import available_learning_skills
from utils.decorators import roles_required
from utils.localization import localized
from utils.responses import api_error, success


teacher_bp = Blueprint("teacher", __name__)


def _notification_title(locale, kind, context=""):
    language = locale if locale in {"ru", "kk", "en"} else "ru"
    copies = {
        "announcement": {
            "ru": f"Объявление · {context}", "kk": f"Хабарландыру · {context}", "en": f"Announcement · {context}",
        },
        "comment": {
            "ru": "Новый комментарий учителя", "kk": "Мұғалімнің жаңа пікірі", "en": "New teacher comment",
        },
        "assignment": {
            "ru": "Новое назначение", "kk": "Жаңа тапсырма", "en": "New assignment",
        },
    }
    return copies[kind][language]


def _class_or_error(class_id):
    classroom = db.session.get(Classroom, class_id)
    if not classroom:
        return None, api_error("CLASS_NOT_FOUND", "Класс не найден", 404)
    if classroom.teacher_id != get_jwt_identity() and get_jwt().get("role") != "admin":
        return None, api_error("FORBIDDEN", "Нет доступа к классу", 403)
    return classroom, None


def _class_payload(classroom, details=False):
    student_count = db.session.scalar(
        db.select(db.func.count()).select_from(ClassEnrollment)
        .where(ClassEnrollment.class_id == classroom.id)
    )
    payload = {
        "id": classroom.id, "name": classroom.name, "subject_id": classroom.subject_id,
        "grade": classroom.grade, "join_code": classroom.join_code,
        "student_count": student_count, "created_at": classroom.created_at.isoformat(),
    }
    if details:
        payload["teacher_id"] = classroom.teacher_id
    return payload


def _class_for_member(class_id):
    classroom = db.session.get(Classroom, class_id)
    if not classroom:
        return None, api_error("CLASS_NOT_FOUND", "Класс не найден", 404)
    user_id = get_jwt_identity()
    role = get_jwt().get("role")
    if role in {"teacher", "admin"}:
        if classroom.teacher_id != user_id and role != "admin":
            return None, api_error("FORBIDDEN", "Нет доступа к классу", 403)
    elif role == "student":
        if not db.session.get(ClassEnrollment, (classroom.id, user_id)):
            return None, api_error("FORBIDDEN", "Вы не состоите в этом классе", 403)
    else:
        return None, api_error("FORBIDDEN", "Нет доступа к классу", 403)
    return classroom, None


def _announcement_payload(announcement):
    teacher = db.session.get(User, announcement.teacher_id)
    return {
        "id": announcement.id,
        "class_id": announcement.class_id,
        "title": announcement.title,
        "body": announcement.body,
        "is_pinned": announcement.is_pinned,
        "author": teacher.name if teacher else "Учитель",
        "created_at": announcement.created_at.isoformat(),
        "updated_at": announcement.updated_at.isoformat(),
    }


def _student_rows(classroom):
    users = db.session.scalars(
        db.select(User).join(ClassEnrollment, ClassEnrollment.student_id == User.id)
        .where(ClassEnrollment.class_id == classroom.id).order_by(User.name)
    ).all()
    skills = available_learning_skills(classroom.subject_id)
    result = []
    for user in users:
        states = db.session.scalars(
            db.select(KnowledgeState).where(
                KnowledgeState.student_id == user.id,
                KnowledgeState.skill_id.in_([skill.id for skill in skills]),
            )
        ).all() if skills else []
        by_skill = {state.skill_id: state for state in states}
        values = [by_skill.get(skill.id).mastery if by_skill.get(skill.id) else 0 for skill in skills]
        mastery = sum(values) / len(values) if values else 0
        weakest = min(skills, key=lambda skill: by_skill.get(skill.id).mastery if by_skill.get(skill.id) else 0) if skills else None
        completed = db.session.scalars(
            db.select(Attempt).where(Attempt.student_id == user.id, Attempt.status == "completed")
            .order_by(Attempt.completed_at.desc())
        ).all()
        active_days = len({attempt.completed_at.date() for attempt in completed if attempt.completed_at})
        result.append({
            "id": user.id, "name": user.name, "email": user.email,
            "progress": round(mastery * 100), "mastery": round(mastery, 2),
            "streak": active_days,
            "risk": "stable" if mastery >= 0.7 else "attention" if mastery >= 0.4 else "risk",
            "focus": localized(weakest.name) if weakest else "Диагностика не пройдена",
            "skills": [{
                "id": skill.id, "name": localized(skill.name),
                "mastery": round(by_skill.get(skill.id).mastery, 2) if by_skill.get(skill.id) else 0,
            } for skill in skills],
        })
    return result


def _assignment_payload(assignment, include_students=False, student_id=None):
    classroom = db.session.get(Classroom, assignment.class_id)
    students = db.session.scalars(
        db.select(User).join(ClassEnrollment, ClassEnrollment.student_id == User.id)
        .where(ClassEnrollment.class_id == assignment.class_id).order_by(User.name)
    ).all()
    module = db.session.get(LearningModule, assignment.module_id) if assignment.module_id else None
    student_ids = [student.id for student in students]
    task_ids = []
    if assignment.task_id:
        task_ids = [assignment.task_id]
    elif assignment.module_id:
        from models import Lesson
        task_ids = db.session.scalars(
            db.select(Task.id).join(Lesson, Task.lesson_id == Lesson.id)
            .where(Lesson.module_id == assignment.module_id)
        ).all()
    attempts_by_student = {}
    if student_ids and task_ids:
        attempt_rows = db.session.scalars(
            db.select(Attempt).where(
                Attempt.student_id.in_(student_ids), Attempt.task_id.in_(task_ids)
            ).order_by(Attempt.started_at.desc())
        ).all()
        for attempt in attempt_rows:
            state = attempts_by_student.setdefault(attempt.student_id, {
                "completed_task_ids": set(), "started_task_ids": set(), "last_activity_at": None,
            })
            state["started_task_ids"].add(attempt.task_id)
            if attempt.status == "completed":
                state["completed_task_ids"].add(attempt.task_id)
            activity_at = attempt.completed_at or attempt.started_at
            if activity_at and (state["last_activity_at"] is None or activity_at > state["last_activity_at"]):
                state["last_activity_at"] = activity_at
    task_count = len(set(task_ids))
    student_progress = []
    for student in students:
        state = attempts_by_student.get(student.id, {})
        completed_tasks = len(set(state.get("completed_task_ids", set())) & set(task_ids))
        started_tasks = len(set(state.get("started_task_ids", set())) & set(task_ids))
        progress = round(completed_tasks / task_count * 100) if task_count else 0
        student_progress.append({
            "student_id": student.id, "name": student.name, "email": student.email,
            "completed_tasks": completed_tasks, "started_tasks": started_tasks,
            "total_tasks": task_count, "progress": progress,
            "status": "completed" if task_count and completed_tasks == task_count else "in_progress" if started_tasks else "not_started",
            "last_activity_at": state.get("last_activity_at").isoformat() if state.get("last_activity_at") else None,
        })
    completed = sum(item["status"] == "completed" for item in student_progress)
    started = sum(item["status"] != "not_started" for item in student_progress)
    total = len(student_ids)
    overall_progress = round(sum(item["progress"] for item in student_progress) / total) if total else 0
    payload = {
        "id": assignment.id, "title": assignment.title, "class_id": assignment.class_id,
        "class_name": classroom.name if classroom else None, "module_id": assignment.module_id,
        "module_title": localized(module.title) if module else None,
        "module_description": localized(module.description) if module else None,
        "task_id": assignment.task_id, "due_at": assignment.due_at.isoformat() if assignment.due_at else None,
        "status": assignment.status, "completed_students": completed, "total_students": total,
        "started_students": started, "total_tasks": task_count, "progress": overall_progress,
        "created_at": assignment.created_at.isoformat(),
    }
    if include_students:
        payload["student_progress"] = student_progress
    if student_id:
        payload["my_progress"] = next((item for item in student_progress if item["student_id"] == student_id), None)
    return payload


@teacher_bp.get("/teachers/me/classes")
@roles_required("teacher")
def teacher_classes():
    items = db.session.scalars(
        db.select(Classroom).where(Classroom.teacher_id == get_jwt_identity()).order_by(Classroom.created_at.desc())
    ).all()
    return success({"items": [_class_payload(item) for item in items]})


@teacher_bp.get("/students/me/classes")
@roles_required("student")
def student_classes():
    items = db.session.scalars(
        db.select(Classroom)
        .join(ClassEnrollment, ClassEnrollment.class_id == Classroom.id)
        .where(ClassEnrollment.student_id == get_jwt_identity())
        .order_by(ClassEnrollment.joined_at.desc())
    ).all()
    return success({"items": [_class_payload(item, details=True) for item in items]})


@teacher_bp.post("/classes")
@roles_required("teacher")
def create_class():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    subject_id = str(data.get("subject_id", "mathematics"))
    try:
        grade = int(data.get("grade", 9))
    except (TypeError, ValueError):
        return api_error("VALIDATION_ERROR", "Класс должен быть числом", 422)
    if not name or grade not in range(1, 13):
        return api_error("VALIDATION_ERROR", "Укажите название и класс от 1 до 12", 422)
    join_code = secrets.token_hex(3).upper()
    classroom = Classroom(
        teacher_id=get_jwt_identity(), name=name, subject_id=subject_id, grade=grade, join_code=join_code,
    )
    db.session.add(classroom)
    db.session.commit()
    return success({"class": _class_payload(classroom, details=True)}, status=201)


@teacher_bp.get("/classes/<classId>")
@roles_required("teacher", "admin")
def class_details(classId):
    classroom, error = _class_or_error(classId)
    if error:
        return error
    return success({"class": _class_payload(classroom, details=True)})


@teacher_bp.patch("/classes/<classId>")
@roles_required("teacher", "admin")
def update_class(classId):
    classroom, error = _class_or_error(classId)
    if error:
        return error
    data = request.get_json(silent=True) or {}
    if "name" in data:
        classroom.name = str(data["name"]).strip() or classroom.name
    if "grade" in data:
        classroom.grade = int(data["grade"])
    db.session.commit()
    return success({"class": _class_payload(classroom, details=True)})


@teacher_bp.post("/classes/<classId>/join")
@roles_required("student")
def join_class(classId):
    classroom = db.session.get(Classroom, classId)
    data = request.get_json(silent=True) or {}
    if not classroom or str(data.get("join_code", "")).upper() != classroom.join_code:
        return api_error("INVALID_JOIN_CODE", "Класс или код подключения не найден", 404)
    enrollment = db.session.get(ClassEnrollment, (classroom.id, get_jwt_identity()))
    if not enrollment:
        db.session.add(ClassEnrollment(class_id=classroom.id, student_id=get_jwt_identity()))
        db.session.commit()
    return success({"class": _class_payload(classroom)})


@teacher_bp.post("/classes/join")
@roles_required("student")
def join_class_by_code():
    code = str((request.get_json(silent=True) or {}).get("join_code", "")).strip().upper()
    classroom = db.session.scalar(db.select(Classroom).filter_by(join_code=code))
    if not classroom:
        return api_error("INVALID_JOIN_CODE", "Класс с таким кодом не найден", 404)
    enrollment = db.session.get(ClassEnrollment, (classroom.id, get_jwt_identity()))
    if not enrollment:
        db.session.add(ClassEnrollment(class_id=classroom.id, student_id=get_jwt_identity()))
        db.session.commit()
    return success({"class": _class_payload(classroom)})


@teacher_bp.get("/classes/<classId>/feed")
@roles_required("student", "teacher", "admin")
def class_feed(classId):
    classroom, error = _class_for_member(classId)
    if error:
        return error
    announcements = db.session.scalars(
        db.select(ClassAnnouncement)
        .where(ClassAnnouncement.class_id == classroom.id)
        .order_by(ClassAnnouncement.is_pinned.desc(), ClassAnnouncement.created_at.desc())
    ).all()
    assignment_query = db.select(Assignment).where(Assignment.class_id == classroom.id)
    if get_jwt().get("role") == "student":
        assignment_query = assignment_query.where(Assignment.status == "published")
    assignments = db.session.scalars(
        assignment_query.order_by(Assignment.created_at.desc())
    ).all()
    teacher = db.session.get(User, classroom.teacher_id)
    return success({
        "class": {**_class_payload(classroom, details=True), "teacher_name": teacher.name if teacher else "Учитель"},
        "announcements": [_announcement_payload(item) for item in announcements],
        "assignments": [
            _assignment_payload(
                item,
                include_students=get_jwt().get("role") in {"teacher", "admin"},
                student_id=get_jwt_identity() if get_jwt().get("role") == "student" else None,
            ) for item in assignments
        ],
    })


@teacher_bp.post("/classes/<classId>/announcements")
@roles_required("teacher", "admin")
def create_class_announcement(classId):
    classroom, error = _class_or_error(classId)
    if error:
        return error
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    body = str(data.get("body", "")).strip()
    if not title or not body:
        return api_error("VALIDATION_ERROR", "Заполните заголовок и текст объявления", 422)
    if len(title) > 160 or len(body) > 5000:
        return api_error("VALIDATION_ERROR", "Объявление слишком длинное", 422)
    announcement = ClassAnnouncement(
        class_id=classroom.id,
        teacher_id=get_jwt_identity(),
        title=title,
        body=body,
        is_pinned=bool(data.get("is_pinned", False)),
    )
    db.session.add(announcement)
    student_ids = db.session.scalars(
        db.select(ClassEnrollment.student_id).where(ClassEnrollment.class_id == classroom.id)
    ).all()
    for student_id in student_ids:
        student = db.session.get(User, student_id)
        db.session.add(Notification(
            user_id=student_id,
            title=_notification_title(student.locale if student else "ru", "announcement", classroom.name),
            body=title,
            link=f"/student/classes/{classroom.id}",
        ))
    db.session.commit()
    return success({"announcement": _announcement_payload(announcement)}, status=201)


@teacher_bp.delete("/classes/<classId>/announcements/<announcementId>")
@roles_required("teacher", "admin")
def delete_class_announcement(classId, announcementId):
    classroom, error = _class_or_error(classId)
    if error:
        return error
    announcement = db.session.get(ClassAnnouncement, announcementId)
    if not announcement or announcement.class_id != classroom.id:
        return api_error("ANNOUNCEMENT_NOT_FOUND", "Объявление не найдено", 404)
    db.session.delete(announcement)
    db.session.commit()
    return success({"removed": True})


@teacher_bp.delete("/classes/<classId>/students/<studentId>")
@roles_required("teacher", "admin")
def remove_student(classId, studentId):
    classroom, error = _class_or_error(classId)
    if error:
        return error
    enrollment = db.session.get(ClassEnrollment, (classroom.id, studentId))
    if enrollment:
        db.session.delete(enrollment)
        db.session.commit()
    return success({"removed": True})


@teacher_bp.get("/classes/<classId>/students")
@roles_required("teacher")
def class_students(classId):
    classroom, error = _class_or_error(classId)
    if error:
        return error
    return success({"items": _student_rows(classroom)})


@teacher_bp.get("/classes/<classId>/analytics")
@roles_required("teacher")
def class_analytics(classId):
    classroom, error = _class_or_error(classId)
    if error:
        return error
    rows = _student_rows(classroom)
    average = round(sum(row["progress"] for row in rows) / len(rows)) if rows else 0
    return success({
        "student_count": len(rows), "average_mastery": average,
        "risk_students": sum(row["risk"] == "risk" for row in rows),
        "active_students": sum(row["streak"] > 0 for row in rows),
    })


@teacher_bp.get("/classes/<classId>/weak-skills")
@roles_required("teacher")
def class_weak_skills(classId):
    classroom, error = _class_or_error(classId)
    if error:
        return error
    rows = _student_rows(classroom)
    aggregates = {}
    for row in rows:
        for skill in row["skills"]:
            aggregates.setdefault(skill["id"], {"name": skill["name"], "values": []})["values"].append(skill["mastery"])
    items = [{
        "skill_id": skill_id, "name": value["name"],
        "mastery": round(sum(value["values"]) / len(value["values"]), 2),
        "students_below_threshold": sum(item < 0.8 for item in value["values"]),
    } for skill_id, value in aggregates.items()]
    items.sort(key=lambda item: item["mastery"])
    return success({"items": items})


@teacher_bp.get("/teachers/me/dashboard")
@roles_required("teacher")
def teacher_dashboard():
    classrooms = db.session.scalars(
        db.select(Classroom).where(Classroom.teacher_id == get_jwt_identity()).order_by(Classroom.created_at.desc())
    ).all()
    cards = []
    for classroom in classrooms:
        rows = _student_rows(classroom)
        cards.append({
            **_class_payload(classroom),
            "average_mastery": round(sum(row["progress"] for row in rows) / len(rows)) if rows else 0,
            "risk_students": sum(row["risk"] == "risk" for row in rows),
        })
    assignments = db.session.scalars(
        db.select(Assignment).where(Assignment.teacher_id == get_jwt_identity()).order_by(Assignment.created_at.desc()).limit(5)
    ).all()
    return success({"classes": cards, "assignments": [_assignment_payload(item, include_students=True) for item in assignments]})


@teacher_bp.get("/teachers/students/<studentId>/progress")
@roles_required("teacher")
def teacher_student_progress(studentId):
    linked = db.session.scalar(
        db.select(ClassEnrollment).join(Classroom, ClassEnrollment.class_id == Classroom.id)
        .where(ClassEnrollment.student_id == studentId, Classroom.teacher_id == get_jwt_identity())
    )
    if not linked:
        return api_error("FORBIDDEN", "Ученик не связан с вашими классами", 403)
    student = db.session.get(User, studentId)
    classroom = db.session.get(Classroom, linked.class_id)
    row = next(item for item in _student_rows(classroom) if item["id"] == studentId)
    comments = db.session.scalars(
        db.select(TeacherComment).where(
            TeacherComment.teacher_id == get_jwt_identity(), TeacherComment.student_id == studentId
        ).order_by(TeacherComment.created_at.desc())
    ).all()
    return success({"student": student.to_dict(), "progress": row, "comments": [{
        "id": item.id, "message": item.message, "add_to_plan": item.add_to_plan,
        "created_at": item.created_at.isoformat(),
    } for item in comments]})


@teacher_bp.post("/teachers/students/<studentId>/comments")
@roles_required("teacher")
def add_teacher_comment(studentId):
    linked = db.session.scalar(
        db.select(ClassEnrollment).join(Classroom, ClassEnrollment.class_id == Classroom.id)
        .where(ClassEnrollment.student_id == studentId, Classroom.teacher_id == get_jwt_identity())
    )
    if not linked:
        return api_error("FORBIDDEN", "Ученик не связан с вашими классами", 403)
    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()
    if not message:
        return api_error("VALIDATION_ERROR", "Комментарий не может быть пустым", 422)
    comment = TeacherComment(
        teacher_id=get_jwt_identity(), student_id=studentId, message=message,
        add_to_plan=bool(data.get("add_to_plan", False)),
    )
    db.session.add(comment)
    if comment.add_to_plan:
        path = db.session.scalar(
            db.select(LearningPath).where(
                LearningPath.student_id == studentId, LearningPath.status == "active"
            ).order_by(LearningPath.updated_at.desc())
        )
        step = db.session.scalar(
            db.select(LearningStep).where(
                LearningStep.path_id == path.id, LearningStep.status == "available"
            ).order_by(LearningStep.order_index)
        ) if path else None
        if step:
            reason = dict(step.reason or {})
            comment_labels = {"ru": "Комментарий учителя", "kk": "Мұғалім пікірі", "en": "Teacher comment"}
            for locale in ("ru", "kk", "en"):
                prefix = f"{reason.get(locale, '').strip()}\n" if reason.get(locale) else ""
                reason[locale] = f"{prefix}{comment_labels[locale]}: {message}"
            step.reason = reason
    student = db.session.get(User, studentId)
    db.session.add(Notification(
        user_id=studentId, title=_notification_title(student.locale if student else "ru", "comment"), body=message,
        link="/student/path",
    ))
    db.session.commit()
    return success({"comment": {"id": comment.id, "message": comment.message}}, status=201)


@teacher_bp.get("/assignments")
@roles_required("teacher")
def assignments():
    items = db.session.scalars(
        db.select(Assignment).where(Assignment.teacher_id == get_jwt_identity()).order_by(Assignment.created_at.desc())
    ).all()
    return success({"items": [_assignment_payload(item, include_students=True) for item in items]})


@teacher_bp.post("/assignments")
@roles_required("teacher")
def create_assignment():
    data = request.get_json(silent=True) or {}
    classroom, error = _class_or_error(str(data.get("class_id", "")))
    if error:
        return error
    title = str(data.get("title", "")).strip()
    if not title or not (data.get("module_id") or data.get("task_id")):
        return api_error("VALIDATION_ERROR", "Укажите название и модуль или задание", 422)
    module_id = str(data.get("module_id") or "").strip()
    if module_id:
        module = db.session.get(LearningModule, module_id)
        if not module:
            return api_error("MODULE_NOT_FOUND", "Модуль не найден", 404)
        if module.status != "published":
            return api_error(
                "MODULE_NOT_PUBLISHED",
                "Сначала опубликуйте модуль, затем добавьте его в ленту класса",
                409,
            )
    if data.get("task_id"):
        task = db.session.get(Task, str(data["task_id"]))
        if not task or not task.is_published:
            return api_error("TASK_NOT_PUBLISHED", "Назначить можно только опубликованное задание", 409)
    due_at = None
    if data.get("due_at"):
        try:
            due_at = datetime.fromisoformat(str(data["due_at"]).replace("Z", "+00:00"))
        except ValueError:
            return api_error("VALIDATION_ERROR", "Некорректная дата", 422)
    assignment = Assignment(
        class_id=classroom.id, teacher_id=get_jwt_identity(), title=title,
        module_id=module_id or None, task_id=data.get("task_id"), due_at=due_at,
        status=str(data.get("status", "published")),
    )
    db.session.add(assignment)
    student_ids = db.session.scalars(
        db.select(ClassEnrollment.student_id).where(ClassEnrollment.class_id == classroom.id)
    ).all()
    for student_id in student_ids:
        student = db.session.get(User, student_id)
        db.session.add(Notification(
            user_id=student_id, title=_notification_title(student.locale if student else "ru", "assignment"), body=title,
            link=f"/student/classes/{classroom.id}",
        ))
    db.session.commit()
    return success({"assignment": _assignment_payload(assignment, include_students=True)}, status=201)


@teacher_bp.get("/assignments/<assignmentId>")
@roles_required("teacher")
def assignment_details(assignmentId):
    assignment = db.session.get(Assignment, assignmentId)
    if not assignment or assignment.teacher_id != get_jwt_identity():
        return api_error("ASSIGNMENT_NOT_FOUND", "Назначение не найдено", 404)
    return success({"assignment": _assignment_payload(assignment, include_students=True)})


@teacher_bp.patch("/assignments/<assignmentId>")
@roles_required("teacher")
def update_assignment(assignmentId):
    assignment = db.session.get(Assignment, assignmentId)
    if not assignment or assignment.teacher_id != get_jwt_identity():
        return api_error("ASSIGNMENT_NOT_FOUND", "Назначение не найдено", 404)
    data = request.get_json(silent=True) or {}
    for field in ("title", "status"):
        if field in data:
            setattr(assignment, field, str(data[field]))
    db.session.commit()
    return success({"assignment": _assignment_payload(assignment, include_students=True)})


@teacher_bp.post("/assignments/<assignmentId>/publish")
@roles_required("teacher")
def publish_assignment(assignmentId):
    assignment = db.session.get(Assignment, assignmentId)
    if not assignment or assignment.teacher_id != get_jwt_identity():
        return api_error("ASSIGNMENT_NOT_FOUND", "Назначение не найдено", 404)
    assignment.status = "published"
    db.session.commit()
    return success({"assignment": _assignment_payload(assignment, include_students=True)})


@teacher_bp.get("/students/me/assignments")
@roles_required("student")
def student_assignments():
    class_ids = db.session.scalars(
        db.select(ClassEnrollment.class_id).where(ClassEnrollment.student_id == get_jwt_identity())
    ).all()
    items = db.session.scalars(
        db.select(Assignment).where(Assignment.class_id.in_(class_ids), Assignment.status == "published")
        .order_by(Assignment.due_at)
    ).all() if class_ids else []
    return success({"items": [_assignment_payload(item, student_id=get_jwt_identity()) for item in items]})
