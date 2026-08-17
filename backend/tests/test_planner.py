from datetime import date

from models import ProductEvent, db
from services.planner import PlannerConfig, generate_deterministic_plan


def _state():
    base = {
        "topic_id": "topic", "topic_name": "Тема", "grade": 9,
        "is_target_grade": True, "mastery": 0, "confidence": 0,
        "difficulty": 0.5, "importance": 0.9, "learning_minutes": 25,
        "practice_minutes": 20, "blocked_by": [], "priority_score": 0.66,
    }
    return {
        "subject_id": "mathematics", "target_grade": 9,
        "items": [
            {**base, "id": "ready", "name": "Готов", "status": "ready"},
            {**base, "id": "gap", "name": "Пробел", "status": "gap", "priority_score": 0.9},
            {**base, "id": "blocked", "name": "Закрыт", "status": "blocked", "blocked_by": ["gap"]},
        ],
    }


def test_planner_is_deterministic_and_respects_daily_capacity():
    config = PlannerConfig(date(2026, 1, 5), date(2026, 1, 12), 30, 40, 10)
    first = generate_deterministic_plan(_state(), config)
    second = generate_deterministic_plan(_state(), config)
    assert first == second
    assert all(day["planned_minutes"] <= day["capacity_minutes"] for day in first["days"])
    skill_ids = {item["skill_id"] for day in first["days"] for item in day["items"]}
    assert "gap" in skill_ids
    assert "ready" in skill_ids
    assert "blocked" in skill_ids
    first_sequence = {
        skill_id: min(
            item["sequence"]
            for day in first["days"]
            for item in day["items"]
            if item["skill_id"] == skill_id
        )
        for skill_id in skill_ids
    }
    assert first_sequence["gap"] < first_sequence["blocked"]


def test_study_plan_preview_records_server_event(client, student_headers, student):
    response = client.post(
        "/api/v1/students/me/study-plan/preview",
        headers=student_headers,
        json={
            "grade": 9, "start_date": "2026-01-05", "target_date": "2026-01-20",
            "weekday_minutes": 30, "weekend_minutes": 45, "max_skills": 5,
        },
    )
    assert response.status_code == 200
    plan = response.get_json()["data"]["study_plan"]
    assert plan["planner_version"] == "deterministic-planner-v1"
    assert plan["summary"]["selected_skills"] == 5
    event = db.session.scalar(
        db.select(ProductEvent).where(
            ProductEvent.user_id == student.id,
            ProductEvent.event_name == "study_plan_generated",
        )
    )
    assert event.properties["schema_version"] == 1
    assert event.properties["planner_version"] == "deterministic-planner-v1"
