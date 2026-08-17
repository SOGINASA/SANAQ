import json
from datetime import datetime, timezone

from models import ProductEvent, db


EVENT_SCHEMA_VERSION = 1
ALLOWED_EVENTS = {
    "onboarding_completed", "diagnostic_started", "diagnostic_completed",
    "recommendation_opened", "recommendation_reason_viewed", "lesson_completed",
    "answer_submitted", "attempt_started", "attempt_completed",
    "diagnostic_answer_submitted",
    "explanation_mode_changed", "review_completed", "goal_created",
    "curriculum_state_viewed", "study_plan_generated",
    "pathnet_shadow_scored", "pathnet_shadow_failed",
}
SENSITIVE_KEYS = {"answer", "password", "token", "access_token", "refresh_token"}
REQUIRED_PROPERTIES = {
    "attempt_started": {"attempt_id", "task_id", "skill_id", "difficulty"},
    "answer_submitted": {"attempt_id", "task_id", "skill_id", "is_correct", "attempt_number"},
    "attempt_completed": {"attempt_id", "task_id", "skill_id", "score", "mastery_after"},
    "diagnostic_answer_submitted": {"diagnostic_id", "question_id", "skill_id", "is_correct"},
    "study_plan_generated": {"planner_version", "grade", "planned_minutes", "selected_skills"},
    "pathnet_shadow_scored": {
        "model_version", "planner_version", "candidate_count", "comparison_size",
        "overlap_at_k", "latency_ms",
    },
    "pathnet_shadow_failed": {"planner_version", "failure_code"},
}


class EventValidationError(ValueError):
    pass


def validate_event(name, properties):
    if name not in ALLOWED_EVENTS:
        raise EventValidationError("unsupported event")
    if not isinstance(properties, dict):
        raise EventValidationError("properties must be an object")
    if len(properties) > 30:
        raise EventValidationError("too many event properties")
    lowered_keys = {str(key).lower() for key in properties}
    if lowered_keys & SENSITIVE_KEYS:
        raise EventValidationError("sensitive values are not allowed in events")
    missing = REQUIRED_PROPERTIES.get(name, set()) - set(properties)
    if missing:
        raise EventValidationError(f"missing event properties: {', '.join(sorted(missing))}")
    empty_required = {
        key for key in REQUIRED_PROPERTIES.get(name, set())
        if properties.get(key) is None
    }
    if empty_required:
        raise EventValidationError(
            f"empty event properties: {', '.join(sorted(empty_required))}"
        )
    try:
        encoded = json.dumps(properties, ensure_ascii=False, default=str)
    except (TypeError, ValueError) as error:
        raise EventValidationError("properties must be JSON serializable") from error
    if len(encoded.encode("utf-8")) > 8_192:
        raise EventValidationError("event properties are too large")
    return True


def record_learning_event(user_id, name, properties=None, occurred_at=None):
    properties = dict(properties or {})
    validate_event(name, properties)
    properties["schema_version"] = EVENT_SCHEMA_VERSION
    event = ProductEvent(
        user_id=user_id,
        event_name=name,
        properties=properties,
        occurred_at=occurred_at or datetime.now(timezone.utc),
    )
    db.session.add(event)
    return event
