import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
    set_refresh_cookies,
    unset_jwt_cookies,
)

from models import RefreshSession, USER_ROLES, User, db
from utils.responses import api_error, success


auth_bp = Blueprint("auth", __name__)
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _tokens_for(user):
    claims = {"role": user.role, "locale": user.locale}
    return (
        create_access_token(identity=user.id, additional_claims=claims),
        create_refresh_token(identity=user.id),
    )


def _auth_response(user, status=200):
    access_token, refresh_token = _tokens_for(user)
    decoded_refresh = decode_token(refresh_token)
    db.session.add(RefreshSession(
        user_id=user.id,
        token_jti=decoded_refresh["jti"],
        user_agent=request.headers.get("User-Agent", "")[:255] or None,
        ip_address=(request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
                    or request.remote_addr),
        expires_at=datetime.fromtimestamp(decoded_refresh["exp"], timezone.utc),
    ))
    db.session.commit()
    response, _ = success({"user": user.to_dict(), "access_token": access_token}, status)
    set_refresh_cookies(response, refresh_token)
    return response, status


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    name = str(data.get("name") or data.get("full_name") or "").strip()
    role = str(data.get("role", "student")).strip().lower()
    locale = str(data.get("locale", current_app.config["DEFAULT_LOCALE"])).strip().lower()

    details = []
    if not EMAIL_PATTERN.match(email):
        details.append({"field": "email", "message": "Укажите корректный email"})
    if len(password) < 8:
        details.append({"field": "password", "message": "Минимальная длина пароля — 8 символов"})
    if not name:
        details.append({"field": "name", "message": "Укажите имя"})
    if role not in USER_ROLES - {"admin"}:
        details.append({"field": "role", "message": "Допустимы роли student или teacher"})
    if locale not in current_app.config["SUPPORTED_LOCALES"]:
        details.append({"field": "locale", "message": "Допустимы языки ru или kk"})
    if details:
        return api_error("VALIDATION_ERROR", "Проверьте заполненные поля", 422, details)

    if db.session.scalar(db.select(User).filter_by(email=email)):
        return api_error("EMAIL_ALREADY_EXISTS", "Пользователь с таким email уже существует", 409)

    user = User(
        email=email,
        name=name,
        role=role,
        locale=locale,
        region=str(data.get("region", "")).strip() or None,
        timezone=str(data.get("timezone", "Asia/Qyzylorda")).strip(),
        parental_consent_required=role == "student",
        parental_consent_status="pending" if role == "student" else "not_required",
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return _auth_response(user, 201)


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email") or data.get("identifier") or "").strip().lower()
    password = str(data.get("password", ""))
    if not email or not password:
        return api_error("VALIDATION_ERROR", "Укажите email и пароль", 422)

    user = db.session.scalar(db.select(User).filter_by(email=email, is_active=True))
    if not user or not user.check_password(password):
        return api_error("INVALID_CREDENTIALS", "Неверный email или пароль", 401)

    user.last_login_at = datetime.now(timezone.utc)
    return _auth_response(user)


@auth_bp.post("/refresh")
@jwt_required(refresh=True, locations=["cookies"])
def refresh():
    user = db.session.get(User, get_jwt_identity())
    if not user or not user.is_active:
        return api_error("USER_NOT_FOUND", "Пользователь не найден", 404)
    refresh_session = db.session.scalar(
        db.select(RefreshSession).filter_by(token_jti=get_jwt()["jti"], revoked_at=None)
    )
    if not refresh_session:
        return api_error("SESSION_REVOKED", "Сессия завершена", 401)
    token = create_access_token(
        identity=user.id,
        additional_claims={"role": user.role, "locale": user.locale},
    )
    return success({"access_token": token})


@auth_bp.post("/logout")
@jwt_required(refresh=True, locations=["cookies"])
def logout():
    refresh_session = db.session.scalar(
        db.select(RefreshSession).filter_by(token_jti=get_jwt()["jti"], revoked_at=None)
    )
    if refresh_session:
        refresh_session.revoked_at = datetime.now(timezone.utc)
        db.session.commit()
    response, status = success({"message": "Сессия завершена"})
    unset_jwt_cookies(response)
    return response, status


@auth_bp.get("/me")
@jwt_required(locations=["headers"])
def current_user():
    user = db.session.get(User, get_jwt_identity())
    if not user or not user.is_active:
        return api_error("USER_NOT_FOUND", "Пользователь не найден", 404)
    return success({"user": user.to_dict(include_status=True)})


@auth_bp.post("/forgot-password")
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    user = db.session.scalar(db.select(User).filter_by(email=email, is_active=True))
    debug_token = None
    if user:
        raw_token = secrets.token_urlsafe(32)
        user.reset_token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        db.session.commit()
        if current_app.testing or current_app.debug:
            debug_token = raw_token

    payload = {"message": "Если аккаунт существует, инструкции отправлены"}
    if debug_token:
        payload["debug_reset_token"] = debug_token
    return success(payload)


@auth_bp.post("/reset-password")
def reset_password():
    data = request.get_json(silent=True) or {}
    token = str(data.get("token", ""))
    password = str(data.get("password", ""))
    if not token or len(password) < 8:
        return api_error("VALIDATION_ERROR", "Укажите токен и пароль длиной от 8 символов", 422)

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    user = db.session.scalar(db.select(User).filter_by(reset_token_hash=token_hash))
    if not user or not user.reset_token_expires_at:
        return api_error("INVALID_RESET_TOKEN", "Токен недействителен или истёк", 422)
    expires_at = user.reset_token_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        return api_error("INVALID_RESET_TOKEN", "Токен недействителен или истёк", 422)

    user.set_password(password)
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    for session in user.refresh_sessions:
        if session.revoked_at is None:
            session.revoked_at = datetime.now(timezone.utc)
    db.session.commit()
    return success({"message": "Пароль изменён"})


@auth_bp.get("/sessions")
@jwt_required(locations=["headers"])
def sessions():
    user_id = get_jwt_identity()
    items = db.session.scalars(
        db.select(RefreshSession)
        .filter_by(user_id=user_id, revoked_at=None)
        .order_by(RefreshSession.created_at.desc())
    ).all()
    return success({"items": [item.to_dict() for item in items]})


@auth_bp.delete("/sessions/<sessionId>")
@jwt_required(locations=["headers"])
def delete_session(sessionId):
    refresh_session = db.session.scalar(
        db.select(RefreshSession).filter_by(id=sessionId, user_id=get_jwt_identity())
    )
    if not refresh_session:
        return api_error("SESSION_NOT_FOUND", "Сессия не найдена", 404)
    refresh_session.revoked_at = datetime.now(timezone.utc)
    db.session.commit()
    return success({"message": "Сессия завершена"})
