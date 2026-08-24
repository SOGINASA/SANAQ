def test_diagnostic_to_progress_vertical_slice(client, student_headers):
    from models import DiagnosticQuestion, Task, db
    profile = client.put("/api/v1/students/me/profile", headers=student_headers, json={
        "grade": 9,
        "subject_ids": ["mathematics"],
        "goal_ids": ["exam"],
    })
    assert profile.status_code == 200

    created = client.post("/api/v1/diagnostics", headers=student_headers, json={
        "subject_id": "mathematics",
        "goal_id": "exam",
        "grade": 9,
    })
    assert created.status_code == 201
    diagnostic_id = created.get_json()["data"]["diagnostic"]["id"]

    seen = set()
    while True:
        next_response = client.get(
            f"/api/v1/diagnostics/{diagnostic_id}/next-question",
            headers=student_headers,
        )
        assert next_response.status_code == 200
        question = next_response.get_json()["data"]["question"]
        if question is None:
            break
        assert "acceptable_answers" not in question
        seen.add(question["id"])
        stored_question = db.session.get(DiagnosticQuestion, question["id"])
        answer_value = (
            "definitely-wrong"
            if question["skill_id"] in {"common-factor", "grouping"}
            else stored_question.acceptable_answers[0]
        )
        answer = client.post(
            f"/api/v1/diagnostics/{diagnostic_id}/answers",
            headers=student_headers,
            json={
                "question_id": question["id"],
                "answer": answer_value,
                "time_spent_seconds": 20,
                "attempt_number": 1,
            },
        )
        assert answer.status_code == 201
    assert len(seen) == 6

    completed = client.post(
        f"/api/v1/diagnostics/{diagnostic_id}/complete", headers=student_headers
    )
    assert completed.status_code == 201
    completed_data = completed.get_json()["data"]
    assert completed_data["result"]["gaps"][:2] == ["common-factor", "grouping"]
    path_id = completed_data["learning_path_id"]

    next_step = client.get(
        f"/api/v1/learning-paths/{path_id}/next-step", headers=student_headers
    ).get_json()["data"]["step"]
    assert next_step["skill_id"] == "common-factor"
    assert next_step["reason"]
    assert next_step["source_skill_ids"] == ["common-factor"]
    task_id = next_step["task_id"]
    stored_task = db.session.get(Task, task_id)

    task = client.get(f"/api/v1/tasks/{task_id}", headers=student_headers)
    assert task.status_code == 200
    assert "acceptable_answers" not in task.get_json()["data"]["task"]

    attempt = client.post(
        f"/api/v1/tasks/{task_id}/attempts", headers=student_headers
    )
    attempt_id = attempt.get_json()["data"]["attempt"]["id"]
    answer = client.post(
        f"/api/v1/attempts/{attempt_id}/answers",
        headers=student_headers,
        json={"answer": stored_task.acceptable_answers[0]},
    )
    assert answer.status_code == 201
    assert answer.get_json()["data"]["is_correct"] is True
    assert answer.get_json()["data"]["adaptation"]["direction"] == "up"

    explanation = client.post("/api/v1/ai/explanations", headers=student_headers, json={
        "attempt_id": attempt_id,
        "task_id": task_id,
        "mode": "steps",
    })
    assert explanation.status_code == 200
    assert explanation.get_json()["data"]["model_version"] == "content-tutor-v1"

    attempt_result = client.post(
        f"/api/v1/attempts/{attempt_id}/complete", headers=student_headers
    )
    assert attempt_result.status_code == 200
    assert attempt_result.get_json()["data"]["result"]["skill"]["mastery"] >= 0.75
    feedback_summary = attempt_result.get_json()["data"]["result"]["feedback_summary"]
    assert feedback_summary["kind"] == "mastered_first_try"
    assert feedback_summary["attempt_count"] == 1
    adaptation = attempt_result.get_json()["data"]["result"]["adaptation"]
    assert adaptation["recommended_difficulty"] > adaptation["current_difficulty"]
    assert adaptation["reason"]

    updated_step = client.get(
        f"/api/v1/learning-paths/{path_id}/next-step", headers=student_headers
    ).get_json()["data"]["step"]
    assert updated_step["skill_id"] == "grouping"

    path_response = client.get(
        f"/api/v1/learning-paths/{path_id}", headers=student_headers,
    ).get_json()["data"]["learning_path"]
    assert path_response["goal_projection"]["remaining_steps"] >= 1
    assert path_response["goal_projection"]["estimated_completion_date"]
    assert path_response["goal_projection"]["status"] in {"on_track", "at_risk"}

    progress = client.get(
        "/api/v1/students/me/progress/summary?subject_id=mathematics",
        headers=student_headers,
    )
    assert progress.status_code == 200
    assert progress.get_json()["data"]["daily_step"]["skill_id"] == "grouping"

    knowledge_map = client.get(
        "/api/v1/students/me/knowledge-map?subject_id=mathematics",
        headers=student_headers,
    )
    assert knowledge_map.status_code == 200
    assert len(knowledge_map.get_json()["data"]["nodes"]) == 6
