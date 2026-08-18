from dataclasses import dataclass
from datetime import date, timedelta


PLANNER_VERSION = "deterministic-planner-v1"


class PlannerValidationError(ValueError):
    pass


@dataclass(frozen=True)
class PlannerConfig:
    start_date: date
    target_date: date
    weekday_minutes: int = 30
    weekend_minutes: int = 45
    max_skills: int = 20

    def validate(self):
        if self.target_date < self.start_date:
            raise PlannerValidationError("target_date must not precede start_date")
        if not 5 <= self.weekday_minutes <= 240:
            raise PlannerValidationError("weekday_minutes must be in 5..240")
        if not 5 <= self.weekend_minutes <= 240:
            raise PlannerValidationError("weekend_minutes must be in 5..240")
        if not 1 <= self.max_skills <= 100:
            raise PlannerValidationError("max_skills must be in 1..100")


def _dates(config):
    current = config.start_date
    while current <= config.target_date:
        yield current
        current += timedelta(days=1)


def _candidate_sort_key(item):
    status_order = {
        "review_due": 0, "gap": 1, "learning": 2, "ready": 3, "blocked": 4,
    }
    return (
        status_order[item["status"]],
        -item["priority_score"],
        item["grade"],
        item["id"],
    )


def generate_deterministic_plan(curriculum_state, config, ranked_skill_ids=None):
    config.validate()
    ranking_index = {
        skill_id: index for index, skill_id in enumerate(ranked_skill_ids or [])
    }
    days = {
        day: {
            "date": day.isoformat(),
            "capacity_minutes": (
                config.weekend_minutes if day.weekday() >= 5 else config.weekday_minutes
            ),
            "planned_minutes": 0,
            "items": [],
        }
        for day in _dates(config)
    }
    prerequisites_by_skill = {
        item["id"]: set(item.get("blocked_by", []))
        for item in curriculum_state["items"]
    }
    for edge in curriculum_state.get("edges", []):
        prerequisites_by_skill.setdefault(edge["to"], set()).add(edge["from"])
    completed_ids = {
        item["id"] for item in curriculum_state["items"]
        if item["mastery"] >= 0.75
    }
    remaining = {
        item["id"]: item for item in curriculum_state["items"]
        if item["status"] != "mastered"
    }
    candidates = []
    selected_ids = set()
    while remaining and len(candidates) < config.max_skills:
        eligible = [
            item for item in remaining.values()
            if prerequisites_by_skill.get(item["id"], set()) <= (
                completed_ids | selected_ids
            )
        ]
        if not eligible:
            break
        selected = min(
            eligible,
            key=(
                (lambda item: (
                    ranking_index.get(item["id"], len(ranking_index)),
                    _candidate_sort_key(item),
                ))
                if ranked_skill_ids is not None
                else _candidate_sort_key
            ),
        )
        candidates.append(selected)
        selected_ids.add(selected["id"])
        remaining.pop(selected["id"])
    sequence = 0
    unscheduled = []
    completed_on = {}

    def allocate(skill, activity, minutes, earliest):
        nonlocal sequence
        remaining = minutes
        last_day = None
        for day, bucket in days.items():
            if day < earliest or remaining <= 0:
                continue
            available = bucket["capacity_minutes"] - bucket["planned_minutes"]
            if available <= 0:
                continue
            duration = min(available, remaining)
            sequence += 1
            bucket["items"].append({
                "sequence": sequence,
                "skill_id": skill["id"],
                "skill_name": skill["name"],
                "topic_id": skill["topic_id"],
                "activity": activity,
                "duration_minutes": duration,
                "reason": skill["status"],
                "priority_score": skill["priority_score"],
            })
            bucket["planned_minutes"] += duration
            remaining -= duration
            last_day = day
        return remaining, last_day

    for skill in candidates:
        if skill["status"] == "review_due":
            blocks = [("review", max(10, skill["practice_minutes"] // 2)), ("checkpoint", 10)]
        elif skill["status"] == "gap":
            blocks = [("remediation", skill["practice_minutes"]), ("checkpoint", 10)]
        elif skill["status"] == "learning":
            blocks = [("learn", max(10, skill["learning_minutes"] // 2)), ("practice", skill["practice_minutes"])]
        else:
            blocks = [("learn", skill["learning_minutes"]), ("practice", skill["practice_minutes"])]
        earliest = config.start_date
        fully_scheduled = True
        for activity, minutes in blocks:
            remaining, last_day = allocate(skill, activity, minutes, earliest)
            if remaining:
                unscheduled.append({
                    "skill_id": skill["id"],
                    "activity": activity,
                    "minutes": remaining,
                })
                fully_scheduled = False
                break
            earliest = last_day or earliest
        if fully_scheduled:
            completed_on[skill["id"]] = earliest

    for skill in candidates:
        completed = completed_on.get(skill["id"])
        if not completed or skill["status"] == "review_due":
            continue
        for interval in (1, 3, 7):
            due = completed + timedelta(days=interval)
            if due > config.target_date:
                continue
            remaining, _ = allocate(skill, "spaced_review", 10, due)
            if remaining:
                unscheduled.append({
                    "skill_id": skill["id"],
                    "activity": "spaced_review",
                    "minutes": remaining,
                })

    scheduled_days = [bucket for bucket in days.values() if bucket["items"]]
    planned_minutes = sum(day["planned_minutes"] for day in scheduled_days)
    return {
        "planner_version": PLANNER_VERSION,
        "subject_id": curriculum_state["subject_id"],
        "target_grade": curriculum_state["target_grade"],
        "start_date": config.start_date.isoformat(),
        "target_date": config.target_date.isoformat(),
        "summary": {
            "selected_skills": len(candidates),
            "scheduled_days": len(scheduled_days),
            "planned_minutes": planned_minutes,
            "unscheduled_minutes": sum(item["minutes"] for item in unscheduled),
        },
        "days": scheduled_days,
        "unscheduled": unscheduled,
    }
