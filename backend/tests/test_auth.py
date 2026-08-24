from urllib.parse import parse_qs, urlparse

import routes.auth as auth_routes
from models import OAuthIdentity, User, db


def register(client, **overrides):
    payload = {
        "email": "new@example.com",
        "password": "password123",
        "name": "New Student",
        "role": "student",
        "locale": "ru",
    }
    payload.update(overrides)
    return client.post("/api/v1/auth/register", json=payload)


def test_register_student(client):
    response = register(client)
    assert response.status_code == 201
    body = response.get_json()["data"]
    assert body["user"]["role"] == "student"
    assert body["user"]["parental_consent_status"] == "pending"
    assert body["access_token"]
    assert "refresh_token_cookie=" in response.headers["Set-Cookie"]


def test_register_rejects_admin(client):
    response = register(client, role="admin")
    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "VALIDATION_ERROR"


def test_login_and_me(client, student):
    login = client.post("/api/v1/auth/login", json={
        "email": student.email,
        "password": "password123",
    })
    assert login.status_code == 200
    token = login.get_json()["data"]["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.get_json()["data"]["user"]["id"] == student.id


def test_refresh_uses_http_only_cookie(client, student):
    login = client.post("/api/v1/auth/login", json={
        "email": student.email,
        "password": "password123",
    })
    assert login.status_code == 200
    refreshed = client.post("/api/v1/auth/refresh")
    assert refreshed.status_code == 200
    assert refreshed.get_json()["data"]["access_token"]


def test_logout_revokes_refresh_session(client, student):
    login = client.post("/api/v1/auth/login", json={
        "email": student.email,
        "password": "password123",
    })
    assert login.status_code == 200
    logout = client.post("/api/v1/auth/logout")
    assert logout.status_code == 200
    assert client.post("/api/v1/auth/refresh").status_code == 401


def test_password_reset_in_testing(client, student):
    forgot = client.post("/api/v1/auth/forgot-password", json={"email": student.email})
    token = forgot.get_json()["data"]["debug_reset_token"]
    reset = client.post("/api/v1/auth/reset-password", json={
        "token": token,
        "password": "new-password123",
    })
    assert reset.status_code == 200
    login = client.post("/api/v1/auth/login", json={
        "email": student.email,
        "password": "new-password123",
    })
    assert login.status_code == 200


def test_admin_endpoint_is_role_protected(client, student_headers, admin_headers, student):
    denied = client.get("/api/v1/admin/users", headers=student_headers)
    assert denied.status_code == 403
    allowed = client.get("/api/v1/admin/users", headers=admin_headers)
    assert allowed.status_code == 200
    assert allowed.get_json()["data"]["total"] >= 2


class FakeGoogleClient:
    def __init__(self, userinfo=None):
        self.userinfo_payload = userinfo or {}
        self.redirect_uri = None

    def authorize_redirect(self, redirect_uri):
        self.redirect_uri = redirect_uri
        return auth_routes.redirect("https://accounts.google.test/authorize")

    def authorize_access_token(self):
        return {"userinfo": self.userinfo_payload}


def configure_google(app):
    app.config.update(
        GOOGLE_CLIENT_ID="google-client-id",
        GOOGLE_CLIENT_SECRET="google-client-secret",
        GOOGLE_REDIRECT_URI="https://sanaq.test/api/v1/auth/google/callback",
        FRONTEND_URL="https://sanaq.test",
    )


def test_google_login_starts_oauth_with_configured_callback(app, client, monkeypatch):
    configure_google(app)
    fake_google = FakeGoogleClient()
    monkeypatch.setattr(auth_routes, "get_google_client", lambda: fake_google)

    response = client.get("/api/v1/auth/google?role=teacher&locale=kk")

    assert response.status_code == 302
    assert response.location == "https://accounts.google.test/authorize"
    assert fake_google.redirect_uri == "https://sanaq.test/api/v1/auth/google/callback"
    with client.session_transaction() as oauth_session:
        assert oauth_session["google_oauth_role"] == "teacher"
        assert oauth_session["google_oauth_locale"] == "kk"


def test_google_callback_creates_user_and_exchanges_one_time_code(app, client, monkeypatch):
    configure_google(app)
    fake_google = FakeGoogleClient({
        "sub": "google-subject-123",
        "email": "learner@gmail.com",
        "email_verified": True,
        "name": "Google Learner",
    })
    monkeypatch.setattr(auth_routes, "get_google_client", lambda: fake_google)
    with client.session_transaction() as oauth_session:
        oauth_session["google_oauth_role"] = "teacher"
        oauth_session["google_oauth_locale"] = "kk"

    callback = client.get("/api/v1/auth/google/callback")
    code = parse_qs(urlparse(callback.location).query)["code"][0]
    exchange = client.post("/api/v1/auth/google/exchange", json={"code": code})

    assert callback.status_code == 302
    assert exchange.status_code == 200
    assert exchange.get_json()["data"]["is_new_user"] is True
    assert exchange.get_json()["data"]["user"]["role"] == "teacher"
    assert exchange.get_json()["data"]["access_token"]
    assert "refresh_token_cookie=" in exchange.headers["Set-Cookie"]
    assert client.post("/api/v1/auth/google/exchange", json={"code": code}).status_code == 401
    with app.app_context():
        user = db.session.scalar(db.select(User).filter_by(email="learner@gmail.com"))
        identity = db.session.scalar(db.select(OAuthIdentity).filter_by(subject="google-subject-123"))
        assert user.is_verified is True
        assert user.locale == "kk"
        assert identity.user_id == user.id


def test_google_callback_links_verified_email_to_existing_account(app, client, student, monkeypatch):
    configure_google(app)
    fake_google = FakeGoogleClient({
        "sub": "existing-google-subject",
        "email": student.email,
        "email_verified": True,
        "name": "Ignored Google Name",
    })
    monkeypatch.setattr(auth_routes, "get_google_client", lambda: fake_google)

    callback = client.get("/api/v1/auth/google/callback")
    code = parse_qs(urlparse(callback.location).query)["code"][0]
    exchange = client.post("/api/v1/auth/google/exchange", json={"code": code})

    assert exchange.status_code == 200
    assert exchange.get_json()["data"]["is_new_user"] is False
    assert exchange.get_json()["data"]["user"]["id"] == student.id
    with app.app_context():
        assert db.session.scalar(db.select(User).filter_by(email=student.email)).name == "Test User"
        assert db.session.scalar(
            db.select(OAuthIdentity).filter_by(subject="existing-google-subject")
        ).user_id == student.id


def test_google_callback_rejects_unverified_email(app, client, monkeypatch):
    configure_google(app)
    fake_google = FakeGoogleClient({
        "sub": "unverified-subject",
        "email": "unverified@gmail.com",
        "email_verified": False,
    })
    monkeypatch.setattr(auth_routes, "get_google_client", lambda: fake_google)

    response = client.get("/api/v1/auth/google/callback")

    assert response.status_code == 302
    assert parse_qs(urlparse(response.location).query)["error"] == ["unverified_email"]
    with app.app_context():
        assert db.session.scalar(db.select(User).filter_by(email="unverified@gmail.com")) is None
