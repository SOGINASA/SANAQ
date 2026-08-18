from models import ProductEvent, db
from services.curriculum_graph import build_student_curriculum_state


def _fake_inference(items, _model_path):
    candidates = [item for item in items if item["status"] != "mastered"]
    total = max(1, len(candidates))
    return {
        "model_version": "pathnet-test-active-v1",
        "latency_ms": 1.0,
        "scores": [
            {
                "skill_id": item["id"],
                "selection_probability": (index + 1) / total,
                "predicted_priority": (index + 1) / total,
            }
            for index, item in enumerate(candidates)
        ],
    }


def _preview(client, headers):
    return client.post(
        "/api/v1/students/me/study-plan/preview",
        headers=headers,
        json={
            "grade": 9,
            "start_date": "2026-01-05",
            "target_date": "2026-02-10",
            "weekday_minutes": 60,
            "weekend_minutes": 60,
            "max_skills": 12,
        },
    )


def _scheduled_skill_ids(plan):
    ordered = []
    for day in plan["days"]:
        for item in day["items"]:
            if item["activity"] == "spaced_review" or item["skill_id"] in ordered:
                continue
            ordered.append(item["skill_id"])
    return ordered


def _assert_prerequisites_respected(state, ordered_ids):
    prerequisites = {}
    for edge in state["edges"]:
        prerequisites.setdefault(edge["to"], set()).add(edge["from"])
    satisfied = {
        item["id"] for item in state["items"] if item["mastery"] >= 0.75
    }
    for skill_id in ordered_ids:
        assert prerequisites.get(skill_id, set()) <= satisfied
        satisfied.add(skill_id)


def test_active_pathnet_changes_preview_order_without_breaking_prerequisites(
    app, client, student_headers, student, monkeypatch
):
    app.config["PATHNET_MODE"] = "off"
    deterministic = _preview(client, student_headers).get_json()["data"]["study_plan"]
    deterministic_ids = _scheduled_skill_ids(deterministic)

    monkeypatch.setattr("services.learning_plan.score_curriculum_items", _fake_inference)
    app.config["PATHNET_MODE"] = "active"
    active_response = _preview(client, student_headers)
    active = active_response.get_json()["data"]["study_plan"]
    active_ids = _scheduled_skill_ids(active)

    assert active_response.status_code == 200
    assert active["ranking"] == {
        "mode": "active",
        "applied": "pathnet",
        "planner_version": "deterministic-planner-v1",
        "model_version": "pathnet-test-active-v1",
        "fallback_used": False,
    }
    assert active_ids != deterministic_ids
    with app.test_request_context(headers={"Accept-Language": "ru"}):
        state = build_student_curriculum_state(student.id, "mathematics", 9)
        _assert_prerequisites_respected(state, active_ids)


def test_active_ranking_is_used_by_create_recalculate_and_next_step(
    app, client, student_headers, monkeypatch
):
    monkeypatch.setattr("services.learning_plan.score_curriculum_items", _fake_inference)
    app.config["PATHNET_MODE"] = "active"

    created = client.post(
        "/api/v1/students/me/learning-paths",
        headers=student_headers,
        json={"subject_id": "mathematics", "goal_id": "exam"},
    )
    path = created.get_json()["data"]["learning_path"]
    assert created.status_code == 201
    assert path["ranking"]["applied"] == "pathnet"
    assert path["ranking"]["fallback_used"] is False
    assert path["algorithm_version"] == "pathnet-test-active-v1"
    assert path["steps"]
    ranking_event = db.session.scalar(
        db.select(ProductEvent)
        .where(ProductEvent.event_name == "learning_path_ranked")
        .order_by(ProductEvent.occurred_at.desc())
    )
    assert ranking_event.properties["path_id"] == path["id"]
    assert ranking_event.properties["applied"] == "pathnet"
    assert ranking_event.properties["model_version"] == "pathnet-test-active-v1"
    assert ranking_event.properties["fallback_used"] is False

    recalculated = client.post(
        f"/api/v1/learning-paths/{path['id']}/recalculate",
        headers=student_headers,
    ).get_json()["data"]["learning_path"]
    assert recalculated["ranking"]["applied"] == "pathnet"
    assert recalculated["algorithm_version"] == "pathnet-test-active-v1"

    next_step = client.get(
        f"/api/v1/learning-paths/{path['id']}/next-step",
        headers=student_headers,
    ).get_json()["data"]
    assert next_step["step"] is not None
    assert next_step["ranking"]["applied"] == "pathnet"
    assert next_step["ranking"]["fallback_used"] is False


def test_active_pathnet_failure_is_explicit_deterministic_fallback(
    app, client, student_headers, tmp_path
):
    app.config.update(
        PATHNET_MODE="active",
        PATHNET_MODEL_PATH=str(tmp_path / "missing.pt"),
    )

    response = _preview(client, student_headers)
    ranking = response.get_json()["data"]["study_plan"]["ranking"]
    assert response.status_code == 200
    assert ranking == {
        "mode": "active",
        "applied": "deterministic",
        "planner_version": "deterministic-planner-v1",
        "fallback_used": True,
        "failure_code": "pathnet_unavailable",
        "failure_detail": "model_not_found",
    }


def test_canary_zero_percent_does_not_claim_fallback(app, client, student_headers):
    app.config.update(PATHNET_MODE="canary", PATHNET_CANARY_PERCENT=0)

    ranking = _preview(client, student_headers).get_json()["data"]["study_plan"]["ranking"]
    assert ranking["applied"] == "deterministic"
    assert ranking["canary_selected"] is False
    assert ranking["fallback_used"] is False


def test_canary_hundred_percent_applies_pathnet(
    app, client, student_headers, monkeypatch
):
    monkeypatch.setattr("services.learning_plan.score_curriculum_items", _fake_inference)
    app.config.update(PATHNET_MODE="canary", PATHNET_CANARY_PERCENT=100)

    ranking = _preview(client, student_headers).get_json()["data"]["study_plan"]["ranking"]
    assert ranking["applied"] == "pathnet"
    assert ranking["canary_selected"] is True
    assert ranking["model_version"] == "pathnet-test-active-v1"
    assert ranking["fallback_used"] is False


def test_prerequisite_validation_failure_falls_back(
    app, client, student_headers, monkeypatch
):
    monkeypatch.setattr("services.learning_plan.score_curriculum_items", _fake_inference)
    monkeypatch.setattr(
        "services.learning_plan._order_respects_prerequisites",
        lambda _state, _ordered_ids: False,
    )
    app.config["PATHNET_MODE"] = "active"

    ranking = _preview(client, student_headers).get_json()["data"]["study_plan"]["ranking"]
    assert ranking["applied"] == "deterministic"
    assert ranking["fallback_used"] is True
    assert ranking["failure_code"] == "prerequisite_violation"
