from urllib.parse import urlsplit


def test_goals_and_events_are_persisted(client, student_headers):
    created = client.post(
        "/api/v1/students/me/goals", headers=student_headers,
        json={"title": "Подготовиться к контрольной", "target_date": "2026-09-01"},
    )
    assert created.status_code == 201
    goal = created.get_json()["data"]["goal"]

    listed = client.get("/api/v1/students/me/goals", headers=student_headers)
    assert [item["id"] for item in listed.get_json()["data"]["items"]] == [goal["id"]]

    completed = client.patch(
        f"/api/v1/goals/{goal['id']}", headers=student_headers, json={"status": "completed"},
    )
    assert completed.get_json()["data"]["goal"]["status"] == "completed"

    events = client.post(
        "/api/v1/events/batch", headers=student_headers,
        json={"events": [{"name": "goal_created", "properties": {"goal_id": goal["id"]}}]},
    )
    assert events.get_json()["data"]["accepted"] == 1

    archived = client.delete(f"/api/v1/goals/{goal['id']}", headers=student_headers)
    assert archived.status_code == 200
    assert client.get("/api/v1/students/me/goals", headers=student_headers).get_json()["data"]["items"] == []


def test_material_upload_url_accepts_and_serves_bytes(client, teacher_headers):
    created = client.post(
        "/api/v1/materials/upload-url", headers=teacher_headers,
        json={"filename": "lesson.txt", "content_type": "text/plain"},
    )
    assert created.status_code == 201
    data = created.get_json()["data"]
    upload = urlsplit(data["upload_url"])

    stored = client.put(f"{upload.path}?{upload.query}", data=b"server material")
    assert stored.status_code == 200

    downloaded = client.get(
        f"/api/v1/materials/{data['material_id']}/content", headers=teacher_headers,
    )
    assert downloaded.status_code == 200
    assert downloaded.data == b"server material"


def test_admin_moderation_ai_reports_and_audit(
    client, teacher_headers, student_headers, admin_headers,
):
    module_response = client.post(
        "/api/v1/modules", headers=teacher_headers,
        json={
            "title": "Новый модуль", "description": "Черновик", "subject_id": "mathematics",
            "topic_id": "factoring", "grade": 9, "theory": "Теория", "example": "Пример",
        },
    )
    module_id = module_response.get_json()["data"]["module"]["id"]
    queue = client.get("/api/v1/admin/content/review", headers=admin_headers)
    assert module_id in [item["id"] for item in queue.get_json()["data"]["items"]]
    assert client.post(
        f"/api/v1/admin/content/{module_id}/approve", headers=admin_headers,
    ).get_json()["data"]["content"]["status"] == "published"

    report = client.post(
        "/api/v1/ai/feedback/message-1/report", headers=student_headers,
        json={"reason": "Неточный ответ"},
    )
    report_id = report.get_json()["data"]["report"]["id"]
    reports = client.get("/api/v1/admin/ai/reports", headers=admin_headers)
    assert report_id in [item["id"] for item in reports.get_json()["data"]["items"]]
    resolved = client.patch(
        f"/api/v1/admin/ai/reports/{report_id}", headers=admin_headers,
        json={"status": "resolved", "resolution": "Проверено"},
    )
    assert resolved.get_json()["data"]["report"]["status"] == "resolved"
    audit = client.get("/api/v1/admin/audit-log", headers=admin_headers)
    assert len(audit.get_json()["data"]["items"]) >= 2
