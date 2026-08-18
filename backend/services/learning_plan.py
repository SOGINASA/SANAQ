import hashlib

from flask import current_app

from models import LearningStep, ProductEvent, db
from services.curriculum_graph import build_student_curriculum_state
from services.events import record_learning_event
from services.pathnet_inference import PathNetUnavailable, score_curriculum_items
from services.planner import PLANNER_VERSION, generate_deterministic_plan


VALID_PATHNET_MODES = {"off", "shadow", "canary", "active"}
FALLBACK_FAILURE_CODE = "pathnet_unavailable"


def _prerequisites(curriculum_state):
    prerequisites = {item["id"]: set() for item in curriculum_state["items"]}
    for edge in curriculum_state.get("edges", []):
        prerequisites.setdefault(edge["to"], set()).add(edge["from"])
    return prerequisites


def _completed_ids(curriculum_state):
    return {
        item["id"] for item in curriculum_state["items"]
        if item["mastery"] >= 0.75
    }


def _deterministic_key(item):
    status_order = {
        "review_due": 0,
        "gap": 1,
        "learning": 2,
        "ready": 3,
        "blocked": 4,
    }
    return (
        status_order.get(item["status"], 5),
        -item["priority_score"],
        item["grade"],
        item["id"],
    )


def _rank_candidates(curriculum_state, selectable_ids=None, scores=None):
    selectable = set(selectable_ids) if selectable_ids is not None else None
    scores_by_skill = {
        item["skill_id"]: item for item in (scores or [])
    }
    prerequisites = _prerequisites(curriculum_state)
    completed = _completed_ids(curriculum_state)
    remaining = {
        item["id"]: item
        for item in curriculum_state["items"]
        if (
            item["status"] != "mastered"
            and (selectable is None or item["id"] in selectable)
            and (not scores_by_skill or item["id"] in scores_by_skill)
        )
    }
    ranked = []
    selected = set()
    while remaining:
        eligible = [
            item for item in remaining.values()
            if prerequisites.get(item["id"], set()) <= (completed | selected)
        ]
        if not eligible:
            break
        if scores_by_skill:
            chosen = min(
                eligible,
                key=lambda item: (
                    -scores_by_skill[item["id"]]["selection_probability"],
                    -scores_by_skill[item["id"]]["predicted_priority"],
                    item["id"],
                ),
            )
        else:
            chosen = min(eligible, key=_deterministic_key)
        ranked.append(chosen["id"])
        selected.add(chosen["id"])
        remaining.pop(chosen["id"])
    return ranked


def _order_respects_prerequisites(curriculum_state, ordered_skill_ids):
    prerequisites = _prerequisites(curriculum_state)
    satisfied = _completed_ids(curriculum_state)
    for skill_id in ordered_skill_ids:
        if not prerequisites.get(skill_id, set()) <= satisfied:
            return False
        satisfied.add(skill_id)
    return True


def _canary_selected(student_id, percent):
    percent = max(0, min(100, int(percent)))
    digest = hashlib.sha256(str(student_id).encode("utf-8")).digest()
    bucket = int.from_bytes(digest[:4], "big") % 100
    return bucket < percent, bucket


def _comparison(deterministic_ids, model_ids, top_k):
    size = min(top_k, len(deterministic_ids), len(model_ids))
    deterministic_top = deterministic_ids[:size]
    model_top = model_ids[:size]
    overlap = len(set(deterministic_top) & set(model_top))
    return {
        "comparison_size": size,
        "overlap_at_k": round(overlap / size, 4) if size else 1.0,
        "deterministic_top_skill_ids": deterministic_top[:10],
        "model_top_skill_ids": model_top[:10],
    }


def rank_student_curriculum(student_id, subject_id, grade, selectable_skill_ids=None):
    state = build_student_curriculum_state(student_id, subject_id, grade)
    selectable = set(selectable_skill_ids) if selectable_skill_ids is not None else None
    deterministic_ids = _rank_candidates(state, selectable)
    mode = str(current_app.config.get("PATHNET_MODE", "off")).strip().lower()
    ranking = {
        "mode": mode,
        "applied": "deterministic",
        "planner_version": PLANNER_VERSION,
        "fallback_used": False,
    }
    if mode not in VALID_PATHNET_MODES:
        ranking.update({
            "fallback_used": True,
            "failure_code": "invalid_pathnet_mode",
        })
        return state, deterministic_ids, ranking
    if mode == "off":
        return state, deterministic_ids, ranking

    selected_for_canary = mode != "canary"
    if mode == "canary":
        selected_for_canary, bucket = _canary_selected(
            student_id, current_app.config.get("PATHNET_CANARY_PERCENT", 0)
        )
        ranking.update({"canary_selected": selected_for_canary, "canary_bucket": bucket})
        if not selected_for_canary:
            return state, deterministic_ids, ranking

    score_items = [
        item for item in state["items"]
        if selectable is None or item["id"] in selectable
    ]
    try:
        inference = score_curriculum_items(
            score_items, current_app.config["PATHNET_MODEL_PATH"]
        )
        model_ids = _rank_candidates(state, selectable, inference["scores"])
        comparison = _comparison(
            deterministic_ids,
            model_ids,
            current_app.config.get("PATHNET_TOP_K", 20),
        )
        if mode == "shadow":
            ranking.update({
                "shadow_evaluated": True,
                "shadow_model_version": inference["model_version"],
            })
            record_learning_event(student_id, "pathnet_shadow_scored", {
                **comparison,
                "model_version": inference["model_version"],
                "planner_version": PLANNER_VERSION,
                "candidate_count": len(inference["scores"]),
                "latency_ms": inference["latency_ms"],
            })
            return state, deterministic_ids, ranking
        if not _order_respects_prerequisites(state, model_ids):
            ranking.update({
                "fallback_used": True,
                "failure_code": "prerequisite_violation",
            })
            return state, deterministic_ids, ranking
        ranking.update({
            "applied": "pathnet",
            "model_version": inference["model_version"],
            "fallback_used": False,
        })
        return state, model_ids, ranking
    except PathNetUnavailable as error:
        if mode == "shadow":
            ranking.update({
                "shadow_evaluated": False,
                "shadow_failure_code": error.code,
            })
            record_learning_event(student_id, "pathnet_shadow_failed", {
                "planner_version": PLANNER_VERSION,
                "failure_code": error.code,
            })
            return state, deterministic_ids, ranking
        ranking.update({
            "fallback_used": True,
            "failure_code": FALLBACK_FAILURE_CODE,
            "failure_detail": error.code,
        })
        return state, deterministic_ids, ranking


def generate_student_study_plan(student_id, subject_id, grade, planner_config):
    state, ranked_ids, ranking = rank_student_curriculum(
        student_id, subject_id, grade
    )
    plan = generate_deterministic_plan(state, planner_config, ranked_ids)
    if (
        ranking["applied"] == "pathnet"
        and not _order_respects_prerequisites(state, _scheduled_skill_ids(plan))
    ):
        ranked_ids = _rank_candidates(state)
        plan = generate_deterministic_plan(state, planner_config, ranked_ids)
        ranking = {
            "mode": ranking["mode"],
            "applied": "deterministic",
            "planner_version": PLANNER_VERSION,
            "fallback_used": True,
            "failure_code": "prerequisite_violation",
        }
    plan["ranking"] = ranking
    return plan, state


def _scheduled_skill_ids(plan):
    ordered = []
    for day in plan["days"]:
        for item in day["items"]:
            if item["activity"] == "spaced_review" or item["skill_id"] in ordered:
                continue
            ordered.append(item["skill_id"])
    return ordered


def record_path_ranking(student_id, path_id, operation, ranking):
    record_learning_event(student_id, "learning_path_ranked", {
        "path_id": path_id,
        "operation": operation,
        **ranking,
    })


def path_ranking_metadata(path):
    transient = getattr(path, "_ranking", None)
    if transient:
        return transient
    events = db.session.scalars(
        db.select(ProductEvent)
        .where(
            ProductEvent.user_id == path.student_id,
            ProductEvent.event_name == "learning_path_ranked",
        )
        .order_by(ProductEvent.occurred_at.desc())
    ).all()
    for event in events:
        if event.properties.get("path_id") == path.id:
            return {
                key: value for key, value in event.properties.items()
                if key not in {"path_id", "operation", "schema_version"}
            }
    return {
        "mode": "legacy",
        "applied": "deterministic",
        "planner_version": path.algorithm_version,
        "fallback_used": False,
    }


def next_recommended_step(path):
    return db.session.scalar(
        db.select(LearningStep)
        .where(LearningStep.path_id == path.id, LearningStep.status == "available")
        .order_by(LearningStep.order_index)
    )
