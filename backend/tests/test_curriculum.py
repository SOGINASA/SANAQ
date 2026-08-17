import json

import pytest

from models import CurriculumTopicMetadata, SkillPlanningMetadata, db
from services.curriculum import (
    CURRICULUM_PATH,
    CurriculumValidationError,
    load_math_curriculum,
    seed_math_curriculum,
    validate_math_curriculum,
)


def test_curriculum_file_is_complete_and_bilingual():
    curriculum = load_math_curriculum()
    assert curriculum["grades"] == [7, 8, 9, 10, 11, 12]
    assert len(curriculum["topics"]) == 60
    assert sum(len(topic["skills"]) for topic in curriculum["topics"]) == 180
    assert all(topic["name"]["ru"] and topic["name"]["kk"] for topic in curriculum["topics"])
    assert all(
        skill["name"]["ru"] and skill["name"]["kk"]
        for topic in curriculum["topics"]
        for skill in topic["skills"]
    )


def test_curriculum_seed_is_idempotent(app):
    with app.app_context():
        first = seed_math_curriculum()
        second = seed_math_curriculum()
        assert first == second == {
            "version": "kz-math-7-12-v1",
            "topics": 60,
            "skills": 180,
        }
        assert db.session.scalar(db.select(db.func.count(CurriculumTopicMetadata.topic_id))) == 60
        assert db.session.scalar(db.select(db.func.count(SkillPlanningMetadata.skill_id))) == 180


def test_curriculum_validation_rejects_duplicate_skill_id():
    curriculum = json.loads(CURRICULUM_PATH.read_text(encoding="utf-8"))
    curriculum["topics"][1]["skills"][0]["id"] = curriculum["topics"][0]["skills"][0]["id"]
    with pytest.raises(CurriculumValidationError, match="duplicate skill id"):
        validate_math_curriculum(curriculum)
