from datetime import datetime, timedelta, timezone

from models import KnowledgeState, Notification, db


def test_teacher_class_assignment_and_student_notifications(
    client, teacher_headers, student_headers, student,
):
    created = client.post(
        "/api/v1/classes",
        headers=teacher_headers,
        json={"name": "9A", "subject_id": "mathematics", "grade": 9},
    )
    assert created.status_code == 201
    classroom = created.get_json()["data"]["class"]

    joined = client.post(
        "/api/v1/classes/join",
        headers=student_headers,
        json={"join_code": classroom["join_code"].lower()},
    )
    assert joined.status_code == 200

    classes = client.get("/api/v1/students/me/classes", headers=student_headers)
    assert classes.status_code == 200
    assert classes.get_json()["data"]["items"][0]["id"] == classroom["id"]

    announced = client.post(
        f"/api/v1/classes/{classroom['id']}/announcements",
        headers=teacher_headers,
        json={"title": "Контрольная в пятницу", "body": "Повторите формулы.", "is_pinned": True},
    )
    assert announced.status_code == 201

    feed = client.get(
        f"/api/v1/classes/{classroom['id']}/feed", headers=student_headers,
    )
    assert feed.status_code == 200
    assert feed.get_json()["data"]["announcements"][0]["title"] == "Контрольная в пятницу"

    students = client.get(
        f"/api/v1/classes/{classroom['id']}/students", headers=teacher_headers,
    )
    assert students.status_code == 200
    assert students.get_json()["data"]["items"][0]["id"] == student.id

    knowledge_map = client.get(
        f"/api/v1/students/{student.id}/knowledge-map", headers=teacher_headers,
    )
    assert knowledge_map.status_code == 200
    assert len(knowledge_map.get_json()["data"]["nodes"]) == 6

    assigned = client.post(
        "/api/v1/assignments",
        headers=teacher_headers,
        json={
            "class_id": classroom["id"],
            "title": "Повторить разложение",
            "module_id": "module-factoring",
            "status": "published",
        },
    )
    assert assigned.status_code == 201

    feed = client.get(
        f"/api/v1/classes/{classroom['id']}/feed", headers=student_headers,
    )
    assert feed.status_code == 200
    feed_assignments = feed.get_json()["data"]["assignments"]
    assert len(feed_assignments) == 1
    assert feed_assignments[0]["module_id"] == "module-factoring"

    student_items = client.get(
        "/api/v1/students/me/assignments", headers=student_headers,
    ).get_json()["data"]["items"]
    assert len(student_items) == 1
    assert student_items[0]["title"] == "Повторить разложение"

    notification_items = client.get(
        "/api/v1/notifications", headers=student_headers,
    ).get_json()["data"]["items"]
    assert len(notification_items) == 2
    assert notification_items[0]["read"] is False

    commented = client.post(
        f"/api/v1/teachers/students/{student.id}/comments",
        headers=teacher_headers,
        json={"message": "Проверь общий множитель", "add_to_plan": True},
    )
    assert commented.status_code == 201
    assert db.session.scalar(
        db.select(db.func.count()).select_from(Notification).where(Notification.user_id == student.id)
    ) == 3


def test_ai_conversation_is_persisted_and_owner_protected(
    client, student_headers, create_user, app,
):
    created = client.post(
        "/api/v1/ai/conversations",
        headers=student_headers,
        json={"topic": "Дискриминант"},
    )
    assert created.status_code == 201
    conversation_id = created.get_json()["data"]["conversation"]["id"]

    sent = client.post(
        f"/api/v1/ai/conversations/{conversation_id}/messages",
        headers=student_headers,
        json={"content": "Объясни проще"},
    )
    assert sent.status_code == 201
    assert sent.get_json()["data"]["generated_by_ai"] is False

    history = client.get(
        f"/api/v1/ai/conversations/{conversation_id}", headers=student_headers,
    )
    assert history.status_code == 200
    assert [item["role"] for item in history.get_json()["data"]["messages"]] == [
        "assistant", "user", "assistant",
    ]

    other = create_user(email="other@example.com")
    with app.app_context():
        from flask_jwt_extended import create_access_token
        token = create_access_token(identity=other.id, additional_claims={"role": "student"})
    forbidden = client.get(
        f"/api/v1/ai/conversations/{conversation_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert forbidden.status_code == 403


def test_review_completion_schedules_next_review(client, student_headers, student):
    state = KnowledgeState(
        student_id=student.id,
        skill_id="common-factor",
        mastery=0.65,
        confidence=0.8,
        next_review_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db.session.add(state)
    db.session.commit()

    due = client.get("/api/v1/reviews/due", headers=student_headers)
    assert due.status_code == 200
    assert due.get_json()["data"]["items"][0]["id"] == state.id

    completed = client.post(
        f"/api/v1/reviews/{state.id}/complete", headers=student_headers,
    )
    assert completed.status_code == 200
    assert completed.get_json()["data"]["next_review_at"]

    no_longer_due = client.get("/api/v1/reviews/due", headers=student_headers)
    assert no_longer_due.get_json()["data"]["items"] == []


def test_review_reminder_respects_preferences_and_is_not_duplicated(
    client, student_headers, student,
):
    state = KnowledgeState(
        student_id=student.id,
        skill_id="common-factor",
        mastery=0.55,
        confidence=0.7,
        next_review_at=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    db.session.add(state)
    db.session.commit()

    disabled = client.patch(
        "/api/v1/notification-preferences",
        headers=student_headers,
        json={"reviews": False, "deadlines": True},
    )
    assert disabled.status_code == 200
    items = client.get("/api/v1/notifications", headers=student_headers).get_json()["data"]["items"]
    assert not any(f"review={state.id}" in (item["link"] or "") for item in items)

    client.patch(
        "/api/v1/notification-preferences",
        headers=student_headers,
        json={"reviews": True, "deadlines": True},
    )
    first = client.get("/api/v1/notifications", headers=student_headers).get_json()["data"]["items"]
    second = client.get("/api/v1/notifications", headers=student_headers).get_json()["data"]["items"]
    assert sum(f"review={state.id}" in (item["link"] or "") for item in first) == 1
    assert sum(f"review={state.id}" in (item["link"] or "") for item in second) == 1
