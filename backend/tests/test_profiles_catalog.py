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


def test_catalog_contains_mvp_mathematics_topics(client, student_headers):
    subjects = client.get("/api/v1/catalog/subjects").get_json()["data"]["items"]
    assert subjects[0]["id"] == "mathematics"
    topics = client.get(
        "/api/v1/catalog/subjects/mathematics/topics", headers=student_headers
    ).get_json()["data"]["items"]
    assert {topic["id"] for topic in topics} == {
        "factoring", "quadratic-equations", "quadratic-functions"
    }

