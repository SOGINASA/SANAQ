from flask import Blueprint, current_app, request, session
from flask_jwt_extended import get_jwt_identity, jwt_required
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url, options_to_json_dict
from webauthn.helpers.exceptions import WebAuthnException
from webauthn.helpers.structs import (
    AuthenticatorAttachment,
    AuthenticatorSelectionCriteria,
    AuthenticatorTransport,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from models import PasskeyCredential, User, WebAuthnCeremony, db, utc_now
from routes.auth import issue_auth_response
from utils.responses import api_error, success


passkeys_bp = Blueprint("passkeys", __name__)
_REGISTRATION_PURPOSE = "registration"
_AUTHENTICATION_PURPOSE = "authentication"


def _legacy_session_key(purpose):
    return f"webauthn_{purpose}_ceremony_id"


def _enum_value(value):
    return value.value if hasattr(value, "value") else str(value)


def _save_challenge(purpose, challenge, user_id=None):
    now = utc_now()
    db.session.execute(
        db.delete(WebAuthnCeremony).where(WebAuthnCeremony.expires_at <= now)
    )
    ceremony = WebAuthnCeremony(
        purpose=purpose,
        challenge=bytes_to_base64url(challenge),
        user_id=user_id,
        expires_at=now + current_app.config["WEBAUTHN_CHALLENGE_EXPIRES"],
    )
    db.session.add(ceremony)
    db.session.commit()
    # Temporary compatibility for an already deployed frontend that does not
    # return ceremony_id yet. New clients do not depend on this cookie.
    session[_legacy_session_key(purpose)] = ceremony.id
    return ceremony.id


def _consume_challenge(ceremony_id, purpose, expected_user_id=None):
    legacy_ceremony_id = session.pop(_legacy_session_key(purpose), None)
    if not isinstance(ceremony_id, str) or not ceremony_id:
        ceremony_id = legacy_ceremony_id
    if not isinstance(ceremony_id, str) or not ceremony_id:
        return None

    query = db.select(WebAuthnCeremony).where(
        WebAuthnCeremony.id == ceremony_id,
        WebAuthnCeremony.purpose == purpose,
        WebAuthnCeremony.expires_at > utc_now(),
    )
    if expected_user_id is None:
        query = query.where(WebAuthnCeremony.user_id.is_(None))
    else:
        query = query.where(WebAuthnCeremony.user_id == expected_user_id)

    ceremony = db.session.scalar(query.with_for_update())
    if not ceremony:
        return None

    db.session.delete(ceremony)
    db.session.commit()
    try:
        return base64url_to_bytes(ceremony.challenge)
    except (TypeError, ValueError):
        return None


def _transports(values):
    result = []
    for value in values or []:
        try:
            result.append(AuthenticatorTransport(value))
        except ValueError:
            continue
    return result or None


@passkeys_bp.get("")
@jwt_required(locations=["headers"])
def list_passkeys():
    credentials = db.session.scalars(
        db.select(PasskeyCredential)
        .filter_by(user_id=get_jwt_identity())
        .order_by(PasskeyCredential.created_at.desc())
    ).all()
    return success({"items": [credential.to_dict() for credential in credentials]})


@passkeys_bp.post("/registration/options")
@jwt_required(locations=["headers"])
def registration_options():
    user = db.session.get(User, get_jwt_identity())
    if not user or not user.is_active:
        return api_error("USER_NOT_FOUND", "Пользователь не найден", 404)

    existing = db.session.scalars(
        db.select(PasskeyCredential).filter_by(user_id=user.id)
    ).all()
    exclude_credentials = [
        PublicKeyCredentialDescriptor(
            id=base64url_to_bytes(item.id),
            transports=_transports(item.transports),
        )
        for item in existing
    ]
    options = generate_registration_options(
        rp_id=current_app.config["WEBAUTHN_RP_ID"],
        rp_name=current_app.config["WEBAUTHN_RP_NAME"],
        user_id=user.id.encode("utf-8"),
        user_name=user.email,
        user_display_name=user.name,
        authenticator_selection=AuthenticatorSelectionCriteria(
            authenticator_attachment=AuthenticatorAttachment.PLATFORM,
            resident_key=ResidentKeyRequirement.REQUIRED,
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
        exclude_credentials=exclude_credentials,
    )
    ceremony_id = _save_challenge(_REGISTRATION_PURPOSE, options.challenge, user.id)
    return success({"options": options_to_json_dict(options), "ceremony_id": ceremony_id})


@passkeys_bp.post("/registration/verify")
@jwt_required(locations=["headers"])
def verify_registration():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    data = request.get_json(silent=True) or {}
    credential_payload = data.get("credential")
    expected_challenge = _consume_challenge(
        data.get("ceremony_id"),
        _REGISTRATION_PURPOSE,
        user_id,
    )
    if not user or not user.is_active:
        return api_error("USER_NOT_FOUND", "Пользователь не найден", 404)
    if not credential_payload or expected_challenge is None:
        return api_error("PASSKEY_CHALLENGE_INVALID", "Запрос биометрии истёк. Начните заново", 400)

    try:
        verification = verify_registration_response(
            credential=credential_payload,
            expected_challenge=expected_challenge,
            expected_rp_id=current_app.config["WEBAUTHN_RP_ID"],
            expected_origin=current_app.config["WEBAUTHN_ORIGINS"],
            require_user_verification=True,
        )
    except (WebAuthnException, ValueError, TypeError):
        return api_error("PASSKEY_VERIFICATION_FAILED", "Не удалось подтвердить биометрию", 401)

    credential_id = bytes_to_base64url(verification.credential_id)
    if db.session.get(PasskeyCredential, credential_id):
        return api_error("PASSKEY_ALREADY_EXISTS", "Эта биометрия уже добавлена", 409)

    response = credential_payload.get("response") or {}
    transports = [str(value) for value in response.get("transports", []) if isinstance(value, str)]
    name = str(data.get("name") or "Это устройство").strip()[:100] or "Это устройство"
    passkey = PasskeyCredential(
        id=credential_id,
        user_id=user.id,
        public_key=verification.credential_public_key,
        sign_count=verification.sign_count,
        name=name,
        transports=transports,
        device_type=_enum_value(verification.credential_device_type),
        backed_up=verification.credential_backed_up,
    )
    db.session.add(passkey)
    db.session.commit()
    return success({"credential": passkey.to_dict()}, 201)


@passkeys_bp.post("/authentication/options")
def authentication_options():
    options = generate_authentication_options(
        rp_id=current_app.config["WEBAUTHN_RP_ID"],
        user_verification=UserVerificationRequirement.REQUIRED,
    )
    ceremony_id = _save_challenge(_AUTHENTICATION_PURPOSE, options.challenge)
    return success({"options": options_to_json_dict(options), "ceremony_id": ceremony_id})


@passkeys_bp.post("/authentication/verify")
def verify_authentication():
    data = request.get_json(silent=True) or {}
    credential_payload = data.get("credential") or {}
    credential_id = str(credential_payload.get("id", ""))
    expected_challenge = _consume_challenge(
        data.get("ceremony_id"),
        _AUTHENTICATION_PURPOSE,
    )
    stored = db.session.get(PasskeyCredential, credential_id) if credential_id else None
    if expected_challenge is None:
        return api_error("PASSKEY_CHALLENGE_INVALID", "Запрос биометрии истёк. Начните заново", 400)
    if not stored or not stored.user or not stored.user.is_active:
        return api_error("PASSKEY_NOT_FOUND", "Ключ входа не найден", 401)

    user_handle = (credential_payload.get("response") or {}).get("userHandle")
    if not user_handle:
        return api_error("PASSKEY_VERIFICATION_FAILED", "Не удалось подтвердить биометрию", 401)
    try:
        if base64url_to_bytes(user_handle) != stored.user_id.encode("utf-8"):
            return api_error("PASSKEY_VERIFICATION_FAILED", "Не удалось подтвердить биометрию", 401)
    except (TypeError, ValueError):
        return api_error("PASSKEY_VERIFICATION_FAILED", "Не удалось подтвердить биометрию", 401)

    try:
        verification = verify_authentication_response(
            credential=credential_payload,
            expected_challenge=expected_challenge,
            expected_rp_id=current_app.config["WEBAUTHN_RP_ID"],
            expected_origin=current_app.config["WEBAUTHN_ORIGINS"],
            credential_public_key=stored.public_key,
            credential_current_sign_count=stored.sign_count,
            require_user_verification=True,
        )
    except (WebAuthnException, ValueError, TypeError):
        return api_error("PASSKEY_VERIFICATION_FAILED", "Не удалось подтвердить биометрию", 401)

    stored.sign_count = verification.new_sign_count
    stored.device_type = _enum_value(verification.credential_device_type)
    stored.backed_up = verification.credential_backed_up
    stored.last_used_at = utc_now()
    stored.user.last_login_at = utc_now()
    db.session.commit()
    return issue_auth_response(stored.user)


@passkeys_bp.delete("/<credential_id>")
@jwt_required(locations=["headers"])
def delete_passkey(credential_id):
    credential = db.session.scalar(
        db.select(PasskeyCredential).filter_by(
            id=credential_id,
            user_id=get_jwt_identity(),
        )
    )
    if not credential:
        return api_error("PASSKEY_NOT_FOUND", "Ключ входа не найден", 404)
    db.session.delete(credential)
    db.session.commit()
    return success({"message_code": "PASSKEY_REMOVED"})
