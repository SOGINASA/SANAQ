from datetime import datetime, timedelta, timezone

from models import KnowledgeState, db


def test_curriculum_state_explains_mastery_gaps_and_blockers(
    client, student_headers, student
):
    now = datetime.now(timezone.utc)
    db.session.add_all([
        KnowledgeState(
            student_id=student.id,
            skill_id="math-g7-standard-form",
            mastery=0.9,
            confidence=0.9,
            next_review_at=now - timedelta(days=1),
        ),
        KnowledgeState(
            student_id=student.id,
            skill_id="math-g7-integer-powers",
            mastery=0.25,
            confidence=0.8,
        ),
        KnowledgeState(
            student_id=student.id,
            skill_id="math-g7-points-lines-angles",
            mastery=0.85,
            confidence=0.9,
        ),
        KnowledgeState(
            student_id=student.id,
            skill_id="math-g7-adjacent-vertical-angles",
            mastery=0.55,
            confidence=0.75,
        ),
    ])
    db.session.commit()

    response = client.get(
        "/api/v1/students/me/curriculum-state?subject_id=mathematics&grade=9",
        headers=student_headers,
    )
    assert response.status_code == 200
    payload = response.get_json()["data"]
    by_id = {item["id"]: item for item in payload["items"]}

    assert payload["target_grade"] == 9
    assert payload["summary"]["total"] == len(payload["items"])
    assert by_id["math-g7-standard-form"]["status"] == "review_due"
    assert by_id["math-g7-integer-powers"]["status"] == "gap"
    assert by_id["math-g7-number-expressions"]["status"] == "blocked"
    assert by_id["math-g7-number-expressions"]["blocked_by"] == [
        "math-g7-integer-powers"
    ]
    assert by_id["math-g7-points-lines-angles"]["status"] == "mastered"
    assert by_id["math-g7-adjacent-vertical-angles"]["status"] == "learning"
    assert payload["recommended_skill_ids"]
    assert all(
        by_id[skill_id]["status"] in {"review_due", "gap", "learning", "ready"}
        for skill_id in payload["recommended_skill_ids"]
    )


def test_curriculum_state_requires_grade_without_profile(client, student_headers):
    response = client.get(
        "/api/v1/students/me/curriculum-state",
        headers=student_headers,
    )
    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "GRADE_REQUIRED"
