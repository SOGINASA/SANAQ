import copy

import pytest

from services.task_generation import TaskValidationError, generate_task, validate_generated_task
from services.curriculum import load_math_curriculum


@pytest.mark.parametrize("skill_id", [
    "math-g7-linear-equation-solve",
    "math-g8-quadratic-discriminant",
    "math-g8-quadratic-roots",
    "math-g7-integer-powers",
    "math-g8-mean-variance",
])
def test_generators_are_deterministic_and_self_validating(skill_id):
    skill = {"id": skill_id, "name": {"ru": "Навык", "kk": "Дағды"}}
    first = generate_task(skill, difficulty=2, seed=17)
    second = generate_task(skill, difficulty=2, seed=17)
    assert first == second
    assert validate_generated_task(first) is True
    assert first["generator_version"] == "taskgen-v1"


def test_validator_rejects_tampered_answer():
    skill = {
        "id": "math-g7-linear-equation-solve",
        "name": {"ru": "Решать уравнения", "kk": "Теңдеулерді шешу"},
    }
    task = copy.deepcopy(generate_task(skill, seed=9))
    task["acceptable_answers"] = ["999"]
    with pytest.raises(TaskValidationError, match="incorrect generated answer"):
        validate_generated_task(task)


def test_every_curriculum_skill_has_a_valid_generator_fallback():
    curriculum = load_math_curriculum()
    skills = [skill for topic in curriculum["topics"] for skill in topic["skills"]]
    for index, skill in enumerate(skills):
        distractors = [item for item in skills if item["id"] != skill["id"]][:3]
        assert validate_generated_task(
            generate_task(skill, difficulty=index % 3 + 1, seed=123, distractors=distractors)
        )
