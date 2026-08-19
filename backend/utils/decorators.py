from functools import wraps

from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

from models import User, db
from utils.responses import api_error


def roles_required(*allowed_roles):
    def decorator(function):
        @wraps(function)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request(locations=["headers"])
            user = db.session.get(User, get_jwt_identity())
            if not user or not user.is_active:
                return api_error("ACCOUNT_INACTIVE", "Учётная запись недоступна", 401)
            token_role = get_jwt().get("role")
            if token_role != user.role:
                return api_error(
                    "AUTHORIZATION_CHANGED",
                    "Права пользователя изменились. Войдите снова",
                    401,
                )
            if user.role not in allowed_roles:
                return api_error("FORBIDDEN", "Недостаточно прав", 403)
            return function(*args, **kwargs)

        return wrapper

    return decorator


admin_required = roles_required("admin")
