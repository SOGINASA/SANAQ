def test_teacher_can_edit_nested_module_content(client, teacher_headers):
    created = client.post(
        "/api/v1/modules",
        headers=teacher_headers,
        json={
            "title": "Editable module",
            "description": "Draft",
            "subject_id": "mathematics",
            "topic_id": "factoring",
            "grade": 9,
            "lesson_title": "Lesson one",
            "theory": "Initial theory",
            "example": "Initial example",
        },
    )
    assert created.status_code == 201
    module = created.get_json()["data"]["module"]
    lesson_id = module["lessons"][0]["id"]

    task_response = client.post(
        "/api/v1/tasks",
        headers=teacher_headers,
        json={
            "lesson_id": lesson_id,
            "skill_id": "common-factor",
            "prompt": "Choose an answer",
            "task_type": "single_choice",
            "difficulty": 2,
            "options": ["A", "B"],
            "acceptable_answers": ["A"],
            "hint": "Look closely",
            "explanation": "A is correct",
            "is_published": True,
        },
    )
    assert task_response.status_code == 201
    task_id = task_response.get_json()["data"]["task"]["id"]

    details = client.get(f"/api/v1/modules/{module['id']}", headers=teacher_headers)
    assert details.status_code == 200
    task = details.get_json()["data"]["module"]["lessons"][0]["tasks"][0]
    assert task["acceptable_answers"] == ["A"]
    assert task["hint"] == "Look closely"

    updated = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=teacher_headers,
        json={"task_type": "short_answer", "skill_id": "common-factor", "acceptable_answers": ["42"]},
    )
    assert updated.status_code == 200

    assert client.delete(f"/api/v1/tasks/{task_id}", headers=teacher_headers).status_code == 200
    assert client.delete(f"/api/v1/lessons/{lesson_id}", headers=teacher_headers).status_code == 200


def test_student_cannot_open_draft_module(client, teacher_headers, student_headers):
    created = client.post(
        "/api/v1/modules",
        headers=teacher_headers,
        json={"title": "Draft", "subject_id": "mathematics", "topic_id": "factoring", "grade": 9},
    )
    module_id = created.get_json()["data"]["module"]["id"]
    assert client.get(f"/api/v1/modules/{module_id}", headers=student_headers).status_code == 404


def test_atomic_editor_save_rejects_stale_version_and_preserves_long_content(client, teacher_headers):
    module = client.post("/api/v1/modules", headers=teacher_headers, json={
        "title": "Long module", "subject_id": "mathematics", "topic_id": "factoring", "grade": 9,
        "lesson_title": "Initial lesson", "theory": "Initial theory",
    }).get_json()["data"]["module"]
    lesson_id = module["lessons"][0]["id"]
    long_theory = "Detailed explanation. " * 2500
    payload = {
        "expected_version": module["version"], "title": "Long module", "description": "Description",
        "subject_id": "mathematics", "topic_id": "factoring", "grade": 9,
        "lessons": [{"id": lesson_id, "title": "Long lesson", "theory": long_theory, "example": "Example", "tasks": []}],
    }

    saved = client.put(f"/api/v1/modules/{module['id']}/editor", headers=teacher_headers, json=payload)
    assert saved.status_code == 200
    assert saved.get_json()["data"]["module"]["version"] == module["version"] + 1
    assert saved.get_json()["data"]["module"]["lessons"][0]["theory"] == long_theory.strip()

    stale = client.put(f"/api/v1/modules/{module['id']}/editor", headers=teacher_headers, json={
        **payload, "title": "Stale overwrite",
    })
    assert stale.status_code == 409
    error = stale.get_json()["error"]
    assert error["code"] == "CONTENT_VERSION_CONFLICT"
    assert error["details"][0] == {"expected_version": module["version"], "current_version": module["version"] + 1, "code": "CONTENT_VERSION_CONFLICT"}

    current = client.get(f"/api/v1/modules/{module['id']}", headers=teacher_headers).get_json()["data"]["module"]
    assert current["title"] == "Long module"
    assert current["lessons"][0]["theory"] == long_theory.strip()


def test_multiple_choice_and_numeric_answers_are_checked_by_type(
    client, teacher_headers, student_headers,
):
    module = client.post("/api/v1/modules", headers=teacher_headers, json={
        "title": "Typed tasks", "subject_id": "mathematics", "topic_id": "factoring", "grade": 9,
    }).get_json()["data"]["module"]
    lesson_id = module["lessons"][0]["id"]

    def create_task(task_type, acceptable_answers, options=None):
        return client.post("/api/v1/tasks", headers=teacher_headers, json={
            "lesson_id": lesson_id, "skill_id": "common-factor", "prompt": task_type,
            "task_type": task_type, "difficulty": 2, "options": options or [],
            "acceptable_answers": acceptable_answers, "hint": "Hint", "explanation": "Explanation",
            "is_published": True,
        }).get_json()["data"]["task"]["id"]

    multiple_id = create_task("multiple_choice", ["A", "C"], ["A", "B", "C"])
    numeric_id = create_task("numeric", ["3.14", "0.01"])
    matching_id = create_task("matching", ["2+2|||4", "3+3|||6"], {"left": ["2+2", "3+3"], "right": ["6", "4"]})
    ordering_id = create_task("ordering", ["first", "second", "third"], ["third", "first", "second"])
    blank_id = create_task("fill_blank", ["4"])

    for task_id, answer in (
        (multiple_id, '["C", "A"]'),
        (numeric_id, "3,145"),
        (matching_id, '{"3+3": "6", "2+2": "4"}'),
        (ordering_id, '["first", "second", "third"]'),
        (blank_id, "4"),
    ):
        attempt = client.post(f"/api/v1/tasks/{task_id}/attempts", headers=student_headers)
        attempt_id = attempt.get_json()["data"]["attempt"]["id"]
        response = client.post(f"/api/v1/attempts/{attempt_id}/answers", headers=student_headers, json={"answer": answer})
        assert response.status_code == 201
        assert response.get_json()["data"]["is_correct"] is True
