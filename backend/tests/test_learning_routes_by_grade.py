import pytest


@pytest.mark.parametrize("grade", [7, 8, 9, 10, 11, 12])
def test_diagnostic_builds_a_runnable_route_for_every_supported_grade(
    client, student_headers, grade
):
    client.put("/api/v1/students/me/profile", headers=student_headers, json={
        "grade": grade,
        "subject_ids": ["mathematics"],
        "goal_ids": ["school_program"],
    })
    created = client.post("/api/v1/diagnostics", headers=student_headers, json={
        "subject_id": "mathematics",
        "goal_id": "school_program",
        "grade": grade,
    })
    diagnostic = created.get_json()["data"]["diagnostic"]
    assert diagnostic["total_questions"] == 6

    while True:
        next_question = client.get(
            f"/api/v1/diagnostics/{diagnostic['id']}/next-question",
            headers=student_headers,
        ).get_json()["data"]["question"]
        if next_question is None:
            break
        answered = client.post(
            f"/api/v1/diagnostics/{diagnostic['id']}/answers",
            headers=student_headers,
            json={"question_id": next_question["id"], "answer": "wrong"},
        )
        assert answered.status_code == 201

    completed = client.post(
        f"/api/v1/diagnostics/{diagnostic['id']}/complete",
        headers=student_headers,
    )
    path_id = completed.get_json()["data"]["learning_path_id"]
    route = client.get(
        f"/api/v1/learning-paths/{path_id}", headers=student_headers
    ).get_json()["data"]["learning_path"]

    assert route["steps"]
    assert route["schedule"]["selected_skills"] == len(route["steps"])
    assert route["schedule"]["planned_minutes"] > 0
    assert route["weekday_minutes"] == 30
    assert route["weekend_minutes"] == 45
    assert all(step["task_id"] for step in route["steps"])


def test_changing_pace_changes_saved_time_budget_and_recalculates_route(
    client, student_headers
):
    client.put("/api/v1/students/me/profile", headers=student_headers, json={
        "grade": 11,
        "subject_ids": ["mathematics"],
        "goal_ids": ["exam"],
    })
    created = client.post(
        "/api/v1/students/me/learning-paths",
        headers=student_headers,
        json={"subject_id": "mathematics", "goal_id": "exam"},
    ).get_json()["data"]["learning_path"]

    updated = client.patch(
        f"/api/v1/learning-paths/{created['id']}",
        headers=student_headers,
        json={"pace": "intensive"},
    ).get_json()["data"]["learning_path"]
    assert (updated["weekday_minutes"], updated["weekend_minutes"]) == (45, 60)

    recalculated = client.post(
        f"/api/v1/learning-paths/{created['id']}/recalculate",
        headers=student_headers,
    ).get_json()["data"]["learning_path"]
    assert recalculated["steps"]
    assert all(step["planned_date"] for step in recalculated["steps"])
