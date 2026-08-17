from models import ProductEvent, db


def test_attempt_flow_records_learning_events_without_raw_answer(
    client, student_headers, student
):
    started = client.post(
        "/api/v1/tasks/task-common-factor/attempts", headers=student_headers
    ).get_json()["data"]["attempt"]
    client.post(
        f"/api/v1/attempts/{started['id']}/answers",
        headers=student_headers,
        json={"answer": "6(x+2)"},
    )
    client.post(
        f"/api/v1/attempts/{started['id']}/complete", headers=student_headers
    )
    events = db.session.scalars(
        db.select(ProductEvent)
        .where(ProductEvent.user_id == student.id)
        .order_by(ProductEvent.created_at)
    ).all()
    assert [event.event_name for event in events] == [
        "attempt_started", "answer_submitted", "attempt_completed"
    ]
    assert all("answer" not in event.properties for event in events)
    assert all(event.properties["schema_version"] == 1 for event in events)


def test_event_batch_rejects_sensitive_properties(client, student_headers):
    response = client.post(
        "/api/v1/events/batch",
        headers=student_headers,
        json={"events": [{"name": "lesson_completed", "properties": {"token": "secret"}}]},
    )
    assert response.status_code == 422
