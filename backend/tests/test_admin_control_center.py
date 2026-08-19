from models import User, db


def test_demo_accounts_are_seeded_and_can_login(client):
    for email, role in (
        ("student@sanaq.demo", "student"),
        ("teacher@sanaq.demo", "teacher"),
        ("admin@sanaq.demo", "admin"),
    ):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "SanaqDemo2026!"},
        )
        assert response.status_code == 200
        assert response.get_json()["data"]["user"]["role"] == role


def test_admin_dashboard_and_user_management(client, admin_headers):
    dashboard = client.get("/api/v1/admin/dashboard", headers=admin_headers)
    assert dashboard.status_code == 200
    assert dashboard.get_json()["data"]["counts"]["users"] >= 3

    created = client.post(
        "/api/v1/admin/users", headers=admin_headers,
        json={
            "name": "Новый учитель", "email": "managed@example.com",
            "password": "managed123", "role": "teacher",
        },
    )
    assert created.status_code == 201
    user = created.get_json()["data"]["user"]

    updated = client.patch(
        f"/api/v1/admin/users/{user['id']}", headers=admin_headers,
        json={"name": "Учитель после правки"},
    )
    assert updated.get_json()["data"]["user"]["name"] == "Учитель после правки"

    blocked = client.patch(
        f"/api/v1/admin/users/{user['id']}/status", headers=admin_headers,
        json={"is_active": False},
    )
    assert blocked.get_json()["data"]["user"]["is_active"] is False

    password = client.post(
        f"/api/v1/admin/users/{user['id']}/reset-password", headers=admin_headers,
        json={"password": "newpassword123"},
    )
    assert password.status_code == 200


def test_admin_can_edit_and_delete_class(client, admin_headers):
    listed = client.get("/api/v1/admin/classes", headers=admin_headers)
    assert listed.status_code == 200
    classroom = listed.get_json()["data"]["items"][0]

    updated = client.patch(
        f"/api/v1/admin/classes/{classroom['id']}", headers=admin_headers,
        json={"name": "9A под контролем", "grade": 10},
    )
    assert updated.get_json()["data"]["class"]["grade"] == 10

    deleted = client.delete(
        f"/api/v1/admin/classes/{classroom['id']}", headers=admin_headers,
    )
    assert deleted.status_code == 200
    assert deleted.get_json()["data"]["deleted"] is True


def test_admin_access_token_is_rejected_after_account_is_disabled(
    client, admin_headers, create_user,
):
    second_admin = create_user(email="second-admin@example.com", role="admin")
    login = client.post(
        "/api/v1/auth/login",
        json={"email": second_admin.email, "password": "password123"},
    )
    stale_headers = {
        "Authorization": f"Bearer {login.get_json()['data']['access_token']}"
    }

    changed = client.patch(
        f"/api/v1/admin/users/{second_admin.id}/status",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert changed.status_code == 200

    rejected = client.get("/api/v1/admin/dashboard", headers=stale_headers)
    assert rejected.status_code == 401
    assert rejected.get_json()["error"]["code"] == "ACCOUNT_INACTIVE"


def test_admin_access_token_is_rejected_after_role_changes(
    client, admin_headers, create_user,
):
    second_admin = create_user(email="demoted-admin@example.com", role="admin")
    login = client.post(
        "/api/v1/auth/login",
        json={"email": second_admin.email, "password": "password123"},
    )
    stale_headers = {
        "Authorization": f"Bearer {login.get_json()['data']['access_token']}"
    }

    changed = client.patch(
        f"/api/v1/admin/users/{second_admin.id}/status",
        headers=admin_headers,
        json={"role": "student"},
    )
    assert changed.status_code == 200

    rejected = client.post(
        "/api/v1/admin/users",
        headers=stale_headers,
        json={
            "name": "Forbidden write",
            "email": "forbidden-write@example.com",
            "password": "password123",
            "role": "student",
        },
    )
    assert rejected.status_code == 401
    assert rejected.get_json()["error"]["code"] == "AUTHORIZATION_CHANGED"


def test_admin_users_are_paginated_without_losing_total(client, admin_headers):
    db.session.add_all([
        User(
            email=f"bulk-{index:02d}@example.com",
            password_hash="not-used-in-this-test",
            name=f"Bulk user {index:02d}",
            role="student",
        )
        for index in range(55)
    ])
    db.session.commit()

    first = client.get(
        "/api/v1/admin/users?page=1&page_size=50", headers=admin_headers,
    ).get_json()["data"]
    second = client.get(
        "/api/v1/admin/users?page=2&page_size=50", headers=admin_headers,
    ).get_json()["data"]

    assert first["total"] >= 58
    assert len(first["items"]) == 50
    assert len(second["items"]) == first["total"] - 50
