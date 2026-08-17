import json
from pathlib import Path

from models import (
    CurriculumTopicMetadata,
    PrerequisiteEdge,
    Skill,
    SkillPlanningMetadata,
    Subject,
    Topic,
    db,
)


CURRICULUM_PATH = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "curriculum"
    / "mathematics_7_12.v1.json"
)


class CurriculumValidationError(ValueError):
    pass


def _localized_name(value, path):
    if not isinstance(value, dict) or not all(
        isinstance(value.get(locale), str) and value[locale].strip()
        for locale in ("ru", "kk")
    ):
        raise CurriculumValidationError(f"{path}.name must contain non-empty ru and kk")
    return {locale: value[locale].strip() for locale in ("ru", "kk")}


def load_math_curriculum(path=CURRICULUM_PATH):
    with Path(path).open(encoding="utf-8") as source:
        payload = json.load(source)
    validate_math_curriculum(payload)
    return payload


def _skill_value(payload, topic, skill, field):
    return skill.get(field, topic.get("planning", {}).get(field, payload.get("skill_defaults", {}).get(field)))


def validate_math_curriculum(payload):
    if payload.get("subject", {}).get("id") != "mathematics":
        raise CurriculumValidationError("subject.id must be mathematics")
    if payload.get("grades") != [7, 8, 9, 10, 11, 12]:
        raise CurriculumValidationError("grades must be exactly 7 through 12")
    if not isinstance(payload.get("version"), str) or not payload["version"].strip():
        raise CurriculumValidationError("version is required")

    topic_ids = set()
    skill_ids = set()
    covered_grades = set()
    for topic_index, topic in enumerate(payload.get("topics", [])):
        path = f"topics[{topic_index}]"
        topic_id = topic.get("id")
        if not isinstance(topic_id, str) or not topic_id.startswith("math-g"):
            raise CurriculumValidationError(f"{path}.id must start with math-g")
        if topic_id in topic_ids:
            raise CurriculumValidationError(f"duplicate topic id: {topic_id}")
        topic_ids.add(topic_id)
        _localized_name(topic.get("name"), path)

        grade = topic.get("grade")
        if grade not in payload["grades"]:
            raise CurriculumValidationError(f"{path}.grade is outside supported grades")
        covered_grades.add(grade)
        if topic.get("strand") not in {"numbers", "algebra", "analysis", "statistics", "geometry", "modeling"}:
            raise CurriculumValidationError(f"{path}.strand is invalid")
        if not isinstance(topic.get("order"), int) or topic["order"] < 1:
            raise CurriculumValidationError(f"{path}.order must be a positive integer")

        skills = topic.get("skills")
        if not isinstance(skills, list) or len(skills) < 2:
            raise CurriculumValidationError(f"{path} must contain at least two skills")
        for skill_index, skill in enumerate(skills):
            skill_path = f"{path}.skills[{skill_index}]"
            skill_id = skill.get("id")
            if not isinstance(skill_id, str) or not skill_id.startswith(f"math-g{grade}-"):
                raise CurriculumValidationError(
                    f"{skill_path}.id must start with math-g{grade}-"
                )
            if skill_id in skill_ids:
                raise CurriculumValidationError(f"duplicate skill id: {skill_id}")
            skill_ids.add(skill_id)
            _localized_name(skill.get("name"), skill_path)
            for field in ("learning_minutes", "practice_minutes"):
                value = _skill_value(payload, topic, skill, field)
                if not isinstance(value, int) or value < 5:
                    raise CurriculumValidationError(f"{skill_path}.{field} must be >= 5")
            for field in ("difficulty", "importance"):
                value = _skill_value(payload, topic, skill, field)
                if not isinstance(value, (int, float)) or not 0 <= value <= 1:
                    raise CurriculumValidationError(f"{skill_path}.{field} must be in 0..1")

    if covered_grades != set(payload["grades"]):
        raise CurriculumValidationError("every supported grade must contain topics")
    _validate_topic_prerequisites(payload)
    return True


def _validate_topic_prerequisites(payload):
    dependencies = payload.get("topic_prerequisites")
    if not isinstance(dependencies, dict):
        raise CurriculumValidationError("topic_prerequisites must be an object")

    topics = {topic["id"]: topic for topic in payload["topics"]}
    for topic_id, prerequisite_ids in dependencies.items():
        if topic_id not in topics:
            raise CurriculumValidationError(f"unknown topic prerequisite target: {topic_id}")
        if not isinstance(prerequisite_ids, list) or not prerequisite_ids:
            raise CurriculumValidationError(
                f"topic_prerequisites.{topic_id} must be a non-empty list"
            )
        if len(prerequisite_ids) != len(set(prerequisite_ids)):
            raise CurriculumValidationError(f"duplicate prerequisite for topic: {topic_id}")
        target = topics[topic_id]
        for prerequisite_id in prerequisite_ids:
            if prerequisite_id not in topics:
                raise CurriculumValidationError(
                    f"unknown prerequisite topic: {prerequisite_id}"
                )
            prerequisite = topics[prerequisite_id]
            if prerequisite["grade"] > target["grade"] or (
                prerequisite["grade"] == target["grade"]
                and prerequisite["order"] >= target["order"]
            ):
                raise CurriculumValidationError(
                    f"prerequisite {prerequisite_id} must precede {topic_id}"
                )

    visiting = set()
    visited = set()

    def visit(topic_id):
        if topic_id in visiting:
            raise CurriculumValidationError(f"cycle detected at topic: {topic_id}")
        if topic_id in visited:
            return
        visiting.add(topic_id)
        for prerequisite_id in dependencies.get(topic_id, []):
            visit(prerequisite_id)
        visiting.remove(topic_id)
        visited.add(topic_id)

    for topic_id in topics:
        visit(topic_id)


def build_curriculum_edges(payload):
    """Build skill-level edges from ordered skills and topic dependencies."""
    topics = {topic["id"]: topic for topic in payload["topics"]}
    edges = set()
    for topic in payload["topics"]:
        skill_ids = [skill["id"] for skill in topic["skills"]]
        edges.update(zip(skill_ids[1:], skill_ids[:-1]))
    for topic_id, prerequisite_topic_ids in payload["topic_prerequisites"].items():
        target_skill_id = topics[topic_id]["skills"][0]["id"]
        for prerequisite_topic_id in prerequisite_topic_ids:
            prerequisite_skill_id = topics[prerequisite_topic_id]["skills"][-1]["id"]
            edges.add((target_skill_id, prerequisite_skill_id))
    return sorted(edges)


def _upsert(model, identity, **values):
    instance = db.session.get(model, identity)
    if instance is None:
        primary_key = "id" if hasattr(model, "id") else next(iter(model.__table__.primary_key.columns)).name
        instance = model(**{primary_key: identity})
        db.session.add(instance)
    for key, value in values.items():
        setattr(instance, key, value)
    return instance


def seed_math_curriculum(path=CURRICULUM_PATH, commit=True):
    payload = load_math_curriculum(path)
    version = payload["version"]
    subject = payload["subject"]
    _upsert(
        Subject,
        subject["id"],
        name=_localized_name(subject["name"], "subject"),
        grades=payload["grades"],
    )

    topic_count = 0
    skill_count = 0
    for topic in payload["topics"]:
        topic_count += 1
        _upsert(
            Topic,
            topic["id"],
            subject_id=subject["id"],
            name=_localized_name(topic["name"], topic["id"]),
            grade=topic["grade"],
            order_index=topic["order"],
        )
        total_minutes = sum(
            _skill_value(payload, topic, skill, "learning_minutes")
            + _skill_value(payload, topic, skill, "practice_minutes")
            for skill in topic["skills"]
        )
        _upsert(
            CurriculumTopicMetadata,
            topic["id"],
            strand=topic["strand"],
            curriculum_version=version,
            source_scope=topic.get("source_scope", payload["source_scope"]),
            estimated_total_minutes=total_minutes,
        )
        for skill_order, skill in enumerate(topic["skills"], 1):
            skill_count += 1
            _upsert(
                Skill,
                skill["id"],
                topic_id=topic["id"],
                name=_localized_name(skill["name"], skill["id"]),
                order_index=skill_order,
            )
            _upsert(
                SkillPlanningMetadata,
                skill["id"],
                grade=topic["grade"],
                learning_minutes=_skill_value(payload, topic, skill, "learning_minutes"),
                practice_minutes=_skill_value(payload, topic, skill, "practice_minutes"),
                difficulty=float(_skill_value(payload, topic, skill, "difficulty")),
                importance=float(_skill_value(payload, topic, skill, "importance")),
                curriculum_version=version,
            )

    db.session.execute(
        db.delete(PrerequisiteEdge).where(PrerequisiteEdge.skill_id.like("math-g%"))
    )
    curriculum_edges = build_curriculum_edges(payload)
    db.session.add_all([
        PrerequisiteEdge(
            skill_id=skill_id,
            prerequisite_skill_id=prerequisite_skill_id,
        )
        for skill_id, prerequisite_skill_id in curriculum_edges
    ])

    if commit:
        db.session.commit()
    return {
        "version": version,
        "topics": topic_count,
        "skills": skill_count,
        "prerequisite_edges": len(curriculum_edges),
    }
