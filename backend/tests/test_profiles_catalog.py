def test_student_profile_round_trip(client, student_headers):
    response = client.put("/api/v1/students/me/profile", headers=student_headers, json={
        "grade": 9,
        "subject_ids": ["mathematics"],
        "goal_ids": ["exam"],
        "level": "diagnostic_pending",
    })
    assert response.status_code == 200
    assert response.get_json()["data"]["profile"]["grade"] == 9
    loaded = client.get("/api/v1/students/me/profile", headers=student_headers)
    assert loaded.get_json()["data"]["profile"]["subject_ids"] == ["mathematics"]


def test_teacher_profile_round_trip(client, teacher_headers):
    response = client.put("/api/v1/teachers/me/profile", headers=teacher_headers, json={
        "school": "NIS IB Astana",
        "subject_ids": ["mathematics"],
    })
    assert response.status_code == 200
    assert response.get_json()["data"]["profile"]["school"] == "NIS IB Astana"


def test_user_preferences(client, student_headers):
    response = client.patch("/api/v1/users/me/preferences", headers=student_headers, json={
        "theme": "dark",
        "accessibility": {"reduced_motion": True},
    })
    assert response.status_code == 200
    assert response.get_json()["data"]["preferences"]["theme"] == "dark"


def test_catalog_goals_are_localized_strings(client):
    expected = {"ru": "Подготовка к экзамену", "kk": "Емтиханға дайындық", "en": "Exam preparation"}
    for locale, label in expected.items():
        response = client.get("/api/v1/catalog/goals", headers={"Accept-Language": locale})
        assert response.status_code == 200
        goal = response.get_json()["data"]["items"][0]
        assert goal["name"] == label
        assert isinstance(goal["name"], str)


def test_demo_learning_content_has_complete_english_copy(client, student_headers):
    headers = {**student_headers, "Accept-Language": "en"}
    module = client.get("/api/v1/modules/module-factoring", headers=headers)
    assert module.status_code == 200
    payload = module.get_json()["data"]["module"]
    assert payload["title"] == "Factoring"
    assert payload["description"] == "Greatest common factor and grouping"
    assert payload["lessons"][0]["title"] == "How to spot a common factor"
    lesson = client.get("/api/v1/lessons/lesson-factoring", headers=headers).get_json()["data"]["lesson"]
    assert lesson["theory"].startswith("Find the part")
    task = client.get("/api/v1/tasks/task-common-factor", headers=headers).get_json()["data"]["task"]
    assert task["prompt"] == "Factor 6x + 12."


def test_demo_choice_options_are_localized_for_english(client, student_headers):
    headers = {**student_headers, "Accept-Language": "en"}
    response = client.get("/api/v1/tasks/task-parabola", headers=headers)
    assert response.status_code == 200
    assert response.get_json()["data"]["task"]["options"] == ["Up", "Down"]


def test_catalog_contains_mathematics_curriculum_for_grades_7_to_12(
    client, student_headers
):
    subjects = client.get("/api/v1/catalog/subjects").get_json()["data"]["items"]
    assert subjects[0]["id"] == "mathematics"
    assert subjects[0]["grades"] == [7, 8, 9, 10, 11, 12]

    all_topics = client.get(
        "/api/v1/catalog/subjects/mathematics/topics", headers=student_headers
    ).get_json()["data"]["items"]
    assert len(all_topics) == 60
    assert {topic["grade"] for topic in all_topics} == {7, 8, 9, 10, 11, 12}
    assert sum(len(topic["skills"]) for topic in all_topics) == 180

    grade_nine = client.get(
        "/api/v1/catalog/subjects/mathematics/topics?grade=9",
        headers=student_headers,
    ).get_json()["data"]["items"]
    assert len(grade_nine) == 10
    assert all(topic["grade"] == 9 for topic in grade_nine)
    assert "math-g9-quadratic-equations-review" in {
        topic["id"] for topic in grade_nine
    }
    assert all(topic["curriculum_version"] == "kz-math-7-12-v1" for topic in grade_nine)
    assert all(topic["estimated_total_minutes"] > 0 for topic in grade_nine)
    assert any(topic["prerequisite_skill_ids"] for topic in grade_nine)


def test_catalog_exposes_planning_metadata(client, student_headers):
    topics = client.get(
        "/api/v1/catalog/subjects/mathematics/topics?grade=12",
        headers=student_headers,
    ).get_json()["data"]["items"]
    assert len(topics) == 10
    assert all(topic["source_scope"] == "platform_extension" for topic in topics)
    skill = topics[0]["skills"][0]
    assert skill["learning_minutes"] >= 5
    assert skill["practice_minutes"] >= 5
    assert 0 <= skill["difficulty"] <= 1
    assert 0 <= skill["importance"] <= 1


def test_catalog_rejects_unsupported_grade(client, student_headers):
    response = client.get(
        "/api/v1/catalog/subjects/mathematics/topics?grade=6",
        headers=student_headers,
    )
    assert response.status_code == 422


def test_knowledge_graph_includes_target_grade_and_foundations(
    client, student_headers
):
    response = client.get(
        "/api/v1/catalog/subjects/mathematics/knowledge-graph?grade=9",
        headers=student_headers,
    )
    assert response.status_code == 200
    graph = response.get_json()["data"]
    assert graph["target_grade"] == 9
    assert graph["target_node_count"] == 30
    assert graph["foundation_node_count"] > 0
    assert graph["edges"]
    node_ids = {node["id"] for node in graph["nodes"]}
    assert all(
        edge["from"] in node_ids and edge["to"] in node_ids
        for edge in graph["edges"]
    )
    assert all(
        node["grade"] == 9
        for node in graph["nodes"]
        if node["is_target_grade"]
    )
