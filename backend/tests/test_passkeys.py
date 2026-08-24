from datetime import timedelta
from types import SimpleNamespace

import routes.passkeys as passkey_routes
from models import PasskeyCredential, WebAuthnCeremony, db, utc_now
from webauthn.helpers import bytes_to_base64url
from webauthn.helpers.structs import CredentialDeviceType


def test_register_and_list_passkey(app, client, student, student_headers, monkeypatch):
    options_response = client.post(
        "/api/v1/auth/passkeys/registration/options",
        headers=student_headers,
    )
    assert options_response.status_code == 200
    options = options_response.get_json()["data"]["options"]
    assert options["rp"]["id"] == "localhost"
    assert options["authenticatorSelection"]["authenticatorAttachment"] == "platform"
    assert options["authenticatorSelection"]["residentKey"] == "required"
    assert options["authenticatorSelection"]["userVerification"] == "required"
    ceremony_id = options_response.get_json()["data"]["ceremony_id"]
    assert ceremony_id

    monkeypatch.setattr(
        passkey_routes,
        "verify_registration_response",
        lambda **_kwargs: SimpleNamespace(
            credential_id=b"credential-1",
            credential_public_key=b"public-key-1",
            sign_count=0,
            credential_device_type=CredentialDeviceType.SINGLE_DEVICE,
            credential_backed_up=False,
        ),
    )
    credential_payload = {
        "id": "browser-credential-id",
        "rawId": "browser-credential-id",
        "type": "public-key",
        "clientExtensionResults": {},
        "response": {
            "clientDataJSON": "client-data",
            "attestationObject": "attestation",
            "transports": ["internal"],
        },
    }
    cookie_free_client = app.test_client()
    verification = cookie_free_client.post(
        "/api/v1/auth/passkeys/registration/verify",
        headers=student_headers,
        json={
            "credential": credential_payload,
            "ceremony_id": ceremony_id,
            "name": "Windows Hello",
        },
    )
    assert verification.status_code == 201
    saved = verification.get_json()["data"]["credential"]
    assert saved["name"] == "Windows Hello"
    assert saved["transports"] == ["internal"]

    listing = client.get("/api/v1/auth/passkeys", headers=student_headers)
    assert listing.status_code == 200
    assert listing.get_json()["data"]["items"][0]["id"] == bytes_to_base64url(b"credential-1")

    replay = client.post(
        "/api/v1/auth/passkeys/registration/verify",
        headers=student_headers,
        json={"credential": credential_payload, "ceremony_id": ceremony_id},
    )
    assert replay.status_code == 400
    assert replay.get_json()["error"]["code"] == "PASSKEY_CHALLENGE_INVALID"


def test_passwordless_authentication_issues_session(app, client, student, monkeypatch):
    credential_id = bytes_to_base64url(b"credential-2")
    with app.app_context():
        db.session.add(PasskeyCredential(
            id=credential_id,
            user_id=student.id,
            public_key=b"public-key-2",
            sign_count=2,
            name="Touch ID",
            transports=["internal"],
        ))
        db.session.commit()

    options = client.post("/api/v1/auth/passkeys/authentication/options")
    assert options.status_code == 200
    assert options.get_json()["data"]["options"]["allowCredentials"] == []
    assert options.get_json()["data"]["options"]["userVerification"] == "required"
    ceremony_id = options.get_json()["data"]["ceremony_id"]
    assert ceremony_id

    monkeypatch.setattr(
        passkey_routes,
        "verify_authentication_response",
        lambda **_kwargs: SimpleNamespace(
            new_sign_count=3,
            credential_device_type=CredentialDeviceType.MULTI_DEVICE,
            credential_backed_up=True,
        ),
    )
    payload = {
        "id": credential_id,
        "rawId": credential_id,
        "type": "public-key",
        "clientExtensionResults": {},
        "response": {
            "clientDataJSON": "client-data",
            "authenticatorData": "authenticator-data",
            "signature": "signature",
            "userHandle": bytes_to_base64url(student.id.encode("utf-8")),
        },
    }
    cookie_free_client = app.test_client()
    login = cookie_free_client.post(
        "/api/v1/auth/passkeys/authentication/verify",
        json={"credential": payload, "ceremony_id": ceremony_id},
    )
    assert login.status_code == 200
    assert login.get_json()["data"]["user"]["id"] == student.id
    assert login.get_json()["data"]["access_token"]
    assert "refresh_token_cookie=" in login.headers["Set-Cookie"]
    with app.app_context():
        stored = db.session.get(PasskeyCredential, credential_id)
        assert stored.sign_count == 3
        assert stored.backed_up is True
        assert stored.last_used_at is not None

    replay = client.post(
        "/api/v1/auth/passkeys/authentication/verify",
        json={"credential": payload, "ceremony_id": ceremony_id},
    )
    assert replay.status_code == 400
    assert replay.get_json()["error"]["code"] == "PASSKEY_CHALLENGE_INVALID"


def test_expired_or_wrong_purpose_ceremony_is_rejected(
    app,
    client,
    student_headers,
):
    registration = client.post(
        "/api/v1/auth/passkeys/registration/options",
        headers=student_headers,
    )
    ceremony_id = registration.get_json()["data"]["ceremony_id"]
    with app.app_context():
        ceremony = db.session.get(WebAuthnCeremony, ceremony_id)
        ceremony.expires_at = utc_now() - timedelta(seconds=1)
        db.session.commit()

    expired = app.test_client().post(
        "/api/v1/auth/passkeys/registration/verify",
        headers=student_headers,
        json={"credential": {"id": "unused"}, "ceremony_id": ceremony_id},
    )
    assert expired.status_code == 400
    assert expired.get_json()["error"]["code"] == "PASSKEY_CHALLENGE_INVALID"

    authentication = client.post("/api/v1/auth/passkeys/authentication/options")
    wrong_purpose = client.post(
        "/api/v1/auth/passkeys/registration/verify",
        headers=student_headers,
        json={
            "credential": {"id": "unused"},
            "ceremony_id": authentication.get_json()["data"]["ceremony_id"],
        },
    )
    assert wrong_purpose.status_code == 400
    assert wrong_purpose.get_json()["error"]["code"] == "PASSKEY_CHALLENGE_INVALID"


def test_deployed_client_without_ceremony_id_keeps_cookie_fallback(client):
    options = client.post("/api/v1/auth/passkeys/authentication/options")
    assert options.status_code == 200

    first_attempt = client.post(
        "/api/v1/auth/passkeys/authentication/verify",
        json={"credential": {"id": "missing-credential"}},
    )
    assert first_attempt.status_code == 401
    assert first_attempt.get_json()["error"]["code"] == "PASSKEY_NOT_FOUND"

    replay = client.post(
        "/api/v1/auth/passkeys/authentication/verify",
        json={"credential": {"id": "missing-credential"}},
    )
    assert replay.status_code == 400
    assert replay.get_json()["error"]["code"] == "PASSKEY_CHALLENGE_INVALID"


def test_user_can_only_remove_own_passkey(app, client, student, student_headers, admin):
    own_id = bytes_to_base64url(b"own-credential")
    other_id = bytes_to_base64url(b"other-credential")
    with app.app_context():
        db.session.add_all([
            PasskeyCredential(id=own_id, user_id=student.id, public_key=b"own", name="Own"),
            PasskeyCredential(id=other_id, user_id=admin.id, public_key=b"other", name="Other"),
        ])
        db.session.commit()

    denied = client.delete(f"/api/v1/auth/passkeys/{other_id}", headers=student_headers)
    assert denied.status_code == 404
    removed = client.delete(f"/api/v1/auth/passkeys/{own_id}", headers=student_headers)
    assert removed.status_code == 200
