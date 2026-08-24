import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from authlib.integrations.base_client.errors import OAuthError
from flask import Blueprint, current_app, redirect, request, session, url_for
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

from models import OAuthIdentity, OAuthLoginCode, RefreshSession, USER_ROLES, User, db
from services.google_oauth import get_google_client
from utils.responses import api_error, success


auth_bp = Blueprint("auth", __name__)
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _tokens_for(user):
    claims = {"role": user.role, "locale": user.locale}
    return (
        create_access_token(identity=user.id, additional_claims=claims),
        create_refresh_token(identity=user.id),
    )


def issue_auth_response(user, status=200, extra=None):
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
    payload = {"user": user.to_dict(), "access_token": access_token}
    if extra:
        payload.update(extra)
    response, _ = success(payload, status)
    set_refresh_cookies(response, refresh_token)
    return response, status


def _frontend_google_callback(**params):
    query = urlencode(params)
    return f"{current_app.config['FRONTEND_URL']}/auth/google/callback?{query}"


def _google_is_configured():
    return bool(
        current_app.config["GOOGLE_CLIENT_ID"]
        and current_app.config["GOOGLE_CLIENT_SECRET"]
    )


@auth_bp.get("/google")
def google_login():
    if not _google_is_configured():
        return redirect(_frontend_google_callback(error="not_configured"))

    role = str(request.args.get("role", "student")).strip().lower()
    locale = str(request.args.get("locale", current_app.config["DEFAULT_LOCALE"])).strip().lower()
    session["google_oauth_role"] = role if role in USER_ROLES - {"admin"} else "student"
    session["google_oauth_locale"] = (
        locale if locale in current_app.config["SUPPORTED_LOCALES"]
        else current_app.config["DEFAULT_LOCALE"]
    )
    redirect_uri = current_app.config["GOOGLE_REDIRECT_URI"] or url_for(
        "auth.google_callback", _external=True
    )
    return get_google_client().authorize_redirect(redirect_uri)


@auth_bp.get("/google/callback")
def google_callback():
    if not _google_is_configured():
        return redirect(_frontend_google_callback(error="not_configured"))

    try:
        token = get_google_client().authorize_access_token()
        userinfo = token.get("userinfo") or get_google_client().userinfo(token=token)
    except OAuthError as error:
        current_app.logger.info("Google OAuth was not completed: %s", error.error)
        return redirect(_frontend_google_callback(error="access_denied"))
    except Exception as error:
        current_app.logger.warning("Google OAuth callback failed: %s", type(error).__name__)
        return redirect(_frontend_google_callback(error="provider_error"))

    subject = str(userinfo.get("sub", "")).strip()
    email = str(userinfo.get("email", "")).strip().lower()
    email_verified = userinfo.get("email_verified") is True or str(
        userinfo.get("email_verified", "")
    ).lower() == "true"
    if not subject or not EMAIL_PATTERN.match(email) or not email_verified:
        return redirect(_frontend_google_callback(error="unverified_email"))

    identity = db.session.scalar(
        db.select(OAuthIdentity).filter_by(provider="google", subject=subject)
    )
    is_new_user = False
    if identity:
        user = identity.user
        identity.email = email
    else:
        user = db.session.scalar(db.select(User).filter_by(email=email))
        if not user:
            role = session.pop("google_oauth_role", "student")
            locale = session.pop("google_oauth_locale", current_app.config["DEFAULT_LOCALE"])
            name = str(userinfo.get("name") or email.split("@", 1)[0]).strip()[:100]
            user = User(
                email=email,
                name=name,
                role=role,
                locale=locale,
                is_verified=True,
                parental_consent_required=role == "student",
                parental_consent_status="pending" if role == "student" else "not_required",
            )
            # OAuth-only accounts retain a random, unknown password hash so the
            # existing non-null password column and password login stay safe.
            user.set_password(secrets.token_urlsafe(48))
            db.session.add(user)
            db.session.flush()
            is_new_user = True
        else:
            user.is_verified = True
        identity = OAuthIdentity(
            user_id=user.id,
            provider="google",
            subject=subject,
            email=email,
        )
        db.session.add(identity)

    session.pop("google_oauth_role", None)
    session.pop("google_oauth_locale", None)
    if not user.is_active:
        db.session.rollback()
        return redirect(_frontend_google_callback(error="account_disabled"))

    now = datetime.now(timezone.utc)
    db.session.execute(
        db.delete(OAuthLoginCode).where(
            OAuthLoginCode.expires_at < now - timedelta(days=1)
        )
    )
    raw_code = secrets.token_urlsafe(32)
    db.session.add(OAuthLoginCode(
        user_id=user.id,
        code_hash=hashlib.sha256(raw_code.encode("utf-8")).hexdigest(),
        is_new_user=is_new_user,
        expires_at=now + current_app.config["OAUTH_LOGIN_CODE_EXPIRES"],
    ))
    user.last_login_at = now
    db.session.commit()
    return redirect(_frontend_google_callback(code=raw_code))


@auth_bp.post("/google/exchange")
def google_exchange():
    data = request.get_json(silent=True) or {}
    raw_code = str(data.get("code", "")).strip()
    if not raw_code:
        return api_error("VALIDATION_ERROR", "Укажите код авторизации", 422)

    code_hash = hashlib.sha256(raw_code.encode("utf-8")).hexdigest()
    login_code = db.session.scalar(
        db.select(OAuthLoginCode).filter_by(code_hash=code_hash, used_at=None)
    )
    if not login_code:
        return api_error("INVALID_OAUTH_CODE", "Код авторизации недействителен", 401)

    expires_at = login_code.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        return api_error("EXPIRED_OAUTH_CODE", "Код авторизации истёк", 401)

    user = login_code.user
    if not user or not user.is_active:
        return api_error("USER_NOT_FOUND", "Пользователь не найден", 404)

    claimed = db.session.execute(
        db.update(OAuthLoginCode)
        .where(OAuthLoginCode.id == login_code.id, OAuthLoginCode.used_at.is_(None))
        .values(used_at=datetime.now(timezone.utc))
    )
    if claimed.rowcount != 1:
        db.session.rollback()
        return api_error("INVALID_OAUTH_CODE", "Код авторизации уже использован", 401)
    return issue_auth_response(user, extra={"is_new_user": login_code.is_new_user})


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
    return issue_auth_response(user, 201)


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
    return issue_auth_response(user)


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
    response, status = success({"message_code": "SESSION_REVOKED"})
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

    payload = {"message_code": "RECOVERY_REQUEST_ACCEPTED"}
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
    return success({"message_code": "PASSWORD_CHANGED"})


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
    return success({"message_code": "SESSION_REVOKED"})
