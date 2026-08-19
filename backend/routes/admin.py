from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from models import (
    AIReport, Assignment, AuditLog, ClassAnnouncement, ClassEnrollment, Classroom,
    LearningModule, ProductEvent, USER_ROLES, User, db,
)
from services.pathnet_metrics import shadow_metrics
from utils.decorators import admin_required
from utils.responses import api_error, success


admin_bp = Blueprint("admin", __name__)


def _audit(action, entity_type, entity_id=None, details=None):
    db.session.add(AuditLog(
        actor_id=get_jwt_identity(), action=action, entity_type=entity_type,
        entity_id=entity_id, details=details or {},
    ))


def _count(model, *criteria):
    query = db.select(db.func.count()).select_from(model)
    if criteria:
        query = query.where(*criteria)
    return db.session.scalar(query) or 0


def _class_payload(classroom):
    teacher = db.session.get(User, classroom.teacher_id)
    return {
        "id": classroom.id,
        "name": classroom.name,
        "grade": classroom.grade,
        "subject_id": classroom.subject_id,
        "join_code": classroom.join_code,
        "teacher_id": classroom.teacher_id,
        "teacher_name": teacher.name if teacher else "—",
        "student_count": _count(ClassEnrollment, ClassEnrollment.class_id == classroom.id),
        "assignment_count": _count(Assignment, Assignment.class_id == classroom.id),
        "created_at": classroom.created_at.isoformat(),
    }


@admin_bp.get("/dashboard")
@admin_required
def dashboard():
    recent = db.session.scalars(
        db.select(AuditLog).order_by(AuditLog.created_at.desc()).limit(8)
    ).all()
    return success({
        "counts": {
            "users": _count(User),
            "students": _count(User, User.role == "student"),
            "teachers": _count(User, User.role == "teacher"),
            "active_users": _count(User, User.is_active.is_(True)),
            "classes": _count(Classroom),
            "modules": _count(LearningModule),
            "published_modules": _count(LearningModule, LearningModule.status == "published"),
            "open_ai_reports": _count(AIReport, AIReport.status.in_(["open", "reviewing"])),
            "events": _count(ProductEvent),
        },
        "recent_activity": [{
            "id": item.id,
            "action": item.action,
            "entity_type": item.entity_type,
            "entity_id": item.entity_id,
            "created_at": item.created_at.isoformat(),
        } for item in recent],
    })


@admin_bp.get("/pathnet/metrics")
@admin_required
def pathnet_metrics():
    return success(shadow_metrics(request.args.get("model_version") or None))


@admin_bp.get("/users")
@admin_required
def list_users():
    try:
        page = max(int(request.args.get("page", 1)), 1)
        page_size = min(max(int(request.args.get("page_size", 20)), 1), 100)
    except ValueError:
        return api_error("VALIDATION_ERROR", "Параметры пагинации должны быть числами", 422)
    search = request.args.get("search", "").strip()
    role = request.args.get("role", "").strip().lower()
    query = db.select(User).order_by(User.created_at.desc())
    if search:
        query = query.where(db.or_(User.email.ilike(f"%{search}%"), User.name.ilike(f"%{search}%")))
    if role in USER_ROLES:
        query = query.where(User.role == role)
    pagination = db.paginate(query, page=page, per_page=page_size, error_out=False)
    return success({
        "items": [user.to_dict(include_status=True) for user in pagination.items],
        "page": page, "page_size": page_size, "total": pagination.total,
    })


@admin_bp.post("/users")
@admin_required
def create_user():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    name = str(data.get("name", "")).strip()
    password = str(data.get("password", ""))
    role = str(data.get("role", "student")).strip().lower()
    if "@" not in email or not name or len(password) < 8 or role not in USER_ROLES:
        return api_error("VALIDATION_ERROR", "Укажите имя, корректный email, роль и пароль от 8 символов", 422)
    if db.session.scalar(db.select(User).where(User.email == email)):
        return api_error("EMAIL_ALREADY_EXISTS", "Пользователь с таким email уже существует", 409)
    user = User(
        email=email, name=name[:100], role=role, locale=str(data.get("locale", "ru"))[:5],
        is_active=True, is_verified=True,
        parental_consent_required=role == "student",
        parental_consent_status="approved" if role == "student" else "not_required",
    )
    user.set_password(password)
    db.session.add(user)
    db.session.flush()
    _audit("user.created", "user", user.id, {"role": role})
    db.session.commit()
    return success({"user": user.to_dict(include_status=True)}, status=201)


@admin_bp.patch("/users/<userId>")
@admin_required
def update_user(userId):
    user = db.session.get(User, userId)
    if not user:
        return api_error("USER_NOT_FOUND", "Пользователь не найден", 404)
    data = request.get_json(silent=True) or {}
    if "name" in data:
        name = str(data["name"]).strip()
        if not name:
            return api_error("VALIDATION_ERROR", "Имя не может быть пустым", 422)
        user.name = name[:100]
    if "email" in data:
        email = str(data["email"]).strip().lower()
        duplicate = db.session.scalar(db.select(User).where(User.email == email, User.id != user.id))
        if "@" not in email or duplicate:
            return api_error("VALIDATION_ERROR", "Email некорректен или уже занят", 422)
        user.email = email
    for field in ("locale", "region", "timezone"):
        if field in data:
            setattr(user, field, str(data[field]).strip() or None)
    _audit("user.updated", "user", user.id)
    db.session.commit()
    return success({"user": user.to_dict(include_status=True)})


@admin_bp.patch("/users/<userId>/status")
@admin_required
def update_user_status(userId):
    user = db.session.get(User, userId)
    if not user:
        return api_error("USER_NOT_FOUND", "Пользователь не найден", 404)
    data = request.get_json(silent=True) or {}
    if user.id == get_jwt_identity() and (data.get("is_active") is False or data.get("role", "admin") != "admin"):
        return api_error("SELF_LOCKOUT", "Нельзя заблокировать себя или снять собственную роль администратора", 409)
    if "is_active" in data:
        if not isinstance(data["is_active"], bool):
            return api_error("VALIDATION_ERROR", "is_active должен быть boolean", 422)
        user.is_active = data["is_active"]
    if "role" in data:
        role = str(data["role"]).lower()
        if role not in USER_ROLES:
            return api_error("VALIDATION_ERROR", "Недопустимая роль", 422)
        user.role = role
    _audit("user.status_updated", "user", user.id, {"role": user.role, "is_active": user.is_active})
    db.session.commit()
    return success({"user": user.to_dict(include_status=True)})


@admin_bp.post("/users/<userId>/reset-password")
@admin_required
def reset_user_password(userId):
    user = db.session.get(User, userId)
    if not user:
        return api_error("USER_NOT_FOUND", "Пользователь не найден", 404)
    password = str((request.get_json(silent=True) or {}).get("password", ""))
    if len(password) < 8:
        return api_error("VALIDATION_ERROR", "Пароль должен содержать минимум 8 символов", 422)
    user.set_password(password)
    _audit("user.password_reset", "user", user.id)
    db.session.commit()
    return success({"updated": True})


@admin_bp.get("/classes")
@admin_required
def list_classes():
    items = db.session.scalars(db.select(Classroom).order_by(Classroom.created_at.desc())).all()
    return success({"items": [_class_payload(item) for item in items]})


@admin_bp.patch("/classes/<classId>")
@admin_required
def update_class(classId):
    classroom = db.session.get(Classroom, classId)
    if not classroom:
        return api_error("CLASS_NOT_FOUND", "Класс не найден", 404)
    data = request.get_json(silent=True) or {}
    if "name" in data:
        name = str(data["name"]).strip()
        if not name:
            return api_error("VALIDATION_ERROR", "Название не может быть пустым", 422)
        classroom.name = name[:100]
    if "grade" in data:
        try:
            grade = int(data["grade"])
        except (TypeError, ValueError):
            return api_error("VALIDATION_ERROR", "Класс должен быть числом", 422)
        if grade < 7 or grade > 12:
            return api_error("VALIDATION_ERROR", "Допустимы классы 7–12", 422)
        classroom.grade = grade
    if "teacher_id" in data:
        teacher = db.session.get(User, str(data["teacher_id"]))
        if not teacher or teacher.role != "teacher" or not teacher.is_active:
            return api_error("VALIDATION_ERROR", "Выберите активного учителя", 422)
        classroom.teacher_id = teacher.id
    _audit("class.updated", "class", classroom.id)
    db.session.commit()
    return success({"class": _class_payload(classroom)})


@admin_bp.delete("/classes/<classId>")
@admin_required
def delete_class(classId):
    classroom = db.session.get(Classroom, classId)
    if not classroom:
        return api_error("CLASS_NOT_FOUND", "Класс не найден", 404)
    db.session.execute(db.delete(ClassAnnouncement).where(ClassAnnouncement.class_id == classroom.id))
    db.session.execute(db.delete(Assignment).where(Assignment.class_id == classroom.id))
    db.session.execute(db.delete(ClassEnrollment).where(ClassEnrollment.class_id == classroom.id))
    _audit("class.deleted", "class", classroom.id, {"name": classroom.name})
    db.session.delete(classroom)
    db.session.commit()
    return success({"deleted": True})
