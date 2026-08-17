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

