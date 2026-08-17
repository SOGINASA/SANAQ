from datetime import datetime, timezone

from flask import Blueprint, current_app, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import RefreshSession, StudentProfile, TeacherProfile, User, db
from utils.decorators import roles_required
from utils.responses import api_error, success


profiles_bp = Blueprint("profiles", __name__)

DEFAULT_PREFERENCES = {
    "theme": "system",
    "notifications_enabled": True,
    "accessibility": {
        "font_scale": 1,
        "high_contrast": False,
        "reduced_motion": False,
    },
}


def _current_user():
    return db.session.get(User, get_jwt_identity())


@profiles_bp.get("/users/me")
@jwt_required(locations=["headers"])
def get_user_profile():
    user = _current_user()
    if not user or not user.is_active:
        return api_error("USER_NOT_FOUND", "Пользователь не найден", 404)
    return success({"user": user.to_dict(include_status=True)})


@profiles_bp.patch("/users/me")
@jwt_required(locations=["headers"])
def update_user_profile():
    user = _current_user()
    if not user or not user.is_active:
        return api_error("USER_NOT_FOUND", "Пользователь не найден", 404)

    data = request.get_json(silent=True) or {}
    if "name" in data:
        name = str(data["name"]).strip()
        if not name or len(name) > 100:
            return api_error("VALIDATION_ERROR", "Имя должно содержать от 1 до 100 символов", 422)
        user.name = name
    if "region" in data:
        region = str(data["region"]).strip()
        if len(region) > 100:
            return api_error("VALIDATION_ERROR", "Название региона слишком длинное", 422)
        user.region = region or None
    if "timezone" in data:
        timezone_name = str(data["timezone"]).strip()
        if not timezone_name or len(timezone_name) > 64:
            return api_error("VALIDATION_ERROR", "Некорректный часовой пояс", 422)
        user.timezone = timezone_name
    if "locale" in data:
        locale = str(data["locale"]).lower()
        if locale not in current_app.config["SUPPORTED_LOCALES"]:
            return api_error("VALIDATION_ERROR", "Допустимы языки ru или kk", 422)
        user.locale = locale
    db.session.commit()
    return success({"user": user.to_dict(include_status=True)})


@profiles_bp.get("/users/me/preferences")
@jwt_required(locations=["headers"])
def get_preferences():
    user = _current_user()
    if not user or not user.is_active:
        return api_error("USER_NOT_FOUND", "Пользователь не найден", 404)
    return success({"preferences": user.preferences or DEFAULT_PREFERENCES})


@profiles_bp.patch("/users/me/preferences")
@jwt_required(locations=["headers"])
def update_preferences():
    user = _current_user()
    if not user or not user.is_active:
        return api_error("USER_NOT_FOUND", "Пользователь не найден", 404)
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return api_error("VALIDATION_ERROR", "Настройки должны быть JSON-объектом", 422)
    preferences = dict(user.preferences or DEFAULT_PREFERENCES)
    for key in ("theme", "notifications_enabled", "accessibility"):
        if key in data:
            preferences[key] = data[key]
    user.preferences = preferences
    db.session.commit()
    return success({"preferences": preferences})


@profiles_bp.delete("/users/me")
@jwt_required(locations=["headers"])
def delete_user_profile():
    user = _current_user()
    if not user:
        return api_error("USER_NOT_FOUND", "Пользователь не найден", 404)
    user.is_active = False
    now = datetime.now(timezone.utc)
    db.session.execute(
        db.update(RefreshSession)
        .where(RefreshSession.user_id == user.id, RefreshSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    db.session.commit()
    return success({"message": "Запрос на удаление аккаунта принят"}, status=202)


@profiles_bp.get("/students/me/profile")
@roles_required("student")
def get_student_profile():
    profile = db.session.get(StudentProfile, get_jwt_identity())
    return success({"profile": profile.to_dict() if profile else None})


@profiles_bp.put("/students/me/profile")
@roles_required("student")
def put_student_profile():
    data = request.get_json(silent=True) or {}
    try:
        grade = int(data.get("grade"))
    except (TypeError, ValueError):
        return api_error("VALIDATION_ERROR", "Укажите класс от 7 до 12", 422)
    if grade not in range(7, 13):
        return api_error("VALIDATION_ERROR", "Укажите класс от 7 до 12", 422)
    subject_ids = data.get("subject_ids", [])
    goal_ids = data.get("goal_ids", [])
    if not isinstance(subject_ids, list) or not isinstance(goal_ids, list):
        return api_error("VALIDATION_ERROR", "subject_ids и goal_ids должны быть списками", 422)

    user_id = get_jwt_identity()
    profile = db.session.get(StudentProfile, user_id) or StudentProfile(user_id=user_id)
    profile.grade = grade
    profile.subject_ids = subject_ids
    profile.goal_ids = goal_ids
    profile.level = str(data.get("level", "")).strip() or None
    settings = data.get("accessibility_settings", {})
    if not isinstance(settings, dict):
        return api_error("VALIDATION_ERROR", "accessibility_settings должен быть объектом", 422)
    profile.accessibility_settings = settings
    db.session.add(profile)
    db.session.commit()
    return success({"profile": profile.to_dict()})


@profiles_bp.get("/teachers/me/profile")
@roles_required("teacher")
def get_teacher_profile():
    profile = db.session.get(TeacherProfile, get_jwt_identity())
    return success({"profile": profile.to_dict() if profile else None})


@profiles_bp.put("/teachers/me/profile")
@roles_required("teacher")
def put_teacher_profile():
    data = request.get_json(silent=True) or {}
    subject_ids = data.get("subject_ids", [])
    if not isinstance(subject_ids, list):
        return api_error("VALIDATION_ERROR", "subject_ids должен быть списком", 422)
    school = str(data.get("school", "")).strip()
    if len(school) > 200:
        return api_error("VALIDATION_ERROR", "Название школы слишком длинное", 422)

    user_id = get_jwt_identity()
    profile = db.session.get(TeacherProfile, user_id) or TeacherProfile(user_id=user_id)
    profile.school = school or None
    profile.subject_ids = subject_ids
    db.session.add(profile)
    db.session.commit()
    return success({"profile": profile.to_dict()})

