from functools import wraps

from flask_jwt_extended import get_jwt, verify_jwt_in_request

from utils.responses import api_error


def roles_required(*allowed_roles):
    def decorator(function):
        @wraps(function)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request(locations=["headers"])
            if get_jwt().get("role") not in allowed_roles:
                return api_error("FORBIDDEN", "Недостаточно прав", 403)
            return function(*args, **kwargs)

        return wrapper

    return decorator


admin_required = roles_required("admin")

