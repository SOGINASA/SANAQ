from flask import Blueprint, request

from models import USER_ROLES, User, db
from utils.decorators import admin_required
from utils.responses import api_error, success


admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/users")
@admin_required
def list_users():
    try:
        page = max(int(request.args.get("page", 1)), 1)
        page_size = min(max(int(request.args.get("page_size", 20)), 1), 100)
    except ValueError:
        return api_error("VALIDATION_ERROR", "Параметры пагинации должны быть числами", 422)

    search = request.args.get("search", "").strip()
    query = db.select(User).order_by(User.created_at.desc())
    if search:
        query = query.where(db.or_(User.email.ilike(f"%{search}%"), User.name.ilike(f"%{search}%")))
    pagination = db.paginate(query, page=page, per_page=page_size, error_out=False)
    return success({
        "items": [user.to_dict(include_status=True) for user in pagination.items],
        "page": page,
        "page_size": page_size,
        "total": pagination.total,
    })


@admin_bp.patch("/users/<userId>/status")
@admin_required
def update_user_status(userId):
    user = db.session.get(User, userId)
    if not user:
        return api_error("USER_NOT_FOUND", "Пользователь не найден", 404)

    data = request.get_json(silent=True) or {}
    if "is_active" in data:
        if not isinstance(data["is_active"], bool):
            return api_error("VALIDATION_ERROR", "is_active должен быть boolean", 422)
        user.is_active = data["is_active"]
    if "role" in data:
        role = str(data["role"]).lower()
        if role not in USER_ROLES:
            return api_error("VALIDATION_ERROR", "Недопустимая роль", 422)
        user.role = role
    db.session.commit()
    return success({"user": user.to_dict(include_status=True)})
