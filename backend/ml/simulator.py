import argparse
import gzip
import json
import random
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path

from ml.features import FEATURE_SCHEMA_VERSION, encode_skill_state
from services.curriculum import build_curriculum_edges, load_math_curriculum
from services.planner import PlannerConfig


STATUS_PRIORITY = {
    "review_due": 0.90, "gap": 0.82, "learning": 0.70,
    "ready": 0.58, "blocked": 0.10, "mastered": 0.0,
}
DATASET_VERSION = "synthetic-outcomes-v2"


def _clamp(value, minimum=0.0, maximum=1.0):
    return max(minimum, min(maximum, value))


def _simulate_outcome(item, ability, engagement, config, rng):
    difficulty_fit = 1.0 - abs(float(item["difficulty"]) - ability)
    average_daily_minutes = (config.weekday_minutes * 5 + config.weekend_minutes * 2) / 7
    required_minutes = item["learning_minutes"] + item["practice_minutes"]
    time_fit = min(1.0, average_daily_minutes / max(required_minutes, 1))
    blocked = bool(item["blocked_by"])
    completion_probability = _clamp(
        0.12 + engagement * 0.48 + difficulty_fit * 0.22 + time_fit * 0.18
        - (0.55 if blocked else 0.0)
    )
    knowledge_headroom = 1.0 - float(item["mastery"])
    expected_mastery_gain = _clamp(
        knowledge_headroom
        * (0.16 + difficulty_fit * 0.30)
        * completion_probability
        * (0.75 + float(item["importance"]) * 0.25),
        0.0,
        0.55,
    )
    urgency = {
        "review_due": 0.24,
        "gap": 0.18,
        "learning": 0.11,
        "ready": 0.06,
        "blocked": 0.0,
        "mastered": 0.0,
    }[item["status"]]
    if item["is_target_grade"]:
        urgency += 0.08
    if (config.target_date - config.start_date).days <= 21:
        urgency += 0.07
    expected_utility = _clamp(
        expected_mastery_gain * (0.65 + float(item["importance"]) * 0.35) + urgency
    )
    if blocked:
        expected_utility *= 0.12
    if item["status"] == "mastered":
        expected_utility = 0.0

    completed = rng.random() < completion_probability
    realized_gain = _clamp(
        rng.gauss(expected_mastery_gain, 0.045), 0.0, knowledge_headroom
    ) if completed else 0.0
    return {
        "completion_probability": round(completion_probability, 4),
        "expected_mastery_gain": round(expected_mastery_gain, 4),
        "expected_utility": round(expected_utility, 4),
        "completed": completed,
        "realized_mastery_gain": round(realized_gain, 4),
    }


@lru_cache(maxsize=1)
def _curriculum_nodes():
    curriculum = load_math_curriculum()
    defaults = curriculum["skill_defaults"]
    nodes = []
    for topic in curriculum["topics"]:
        planning = {**defaults, **topic.get("planning", {})}
        for skill in topic["skills"]:
            values = {**planning, **skill}
            nodes.append({
                "id": skill["id"], "name": skill["name"]["ru"],
                "topic_id": topic["id"], "grade": topic["grade"],
                "learning_minutes": values["learning_minutes"],
                "practice_minutes": values["practice_minutes"],
                "difficulty": values["difficulty"], "importance": values["importance"],
            })
    edges = [
        {"from": prerequisite, "to": skill}
        for skill, prerequisite in build_curriculum_edges(curriculum)
    ]
    return nodes, edges


def simulate_student(index, seed=42):
    rng = random.Random(f"{seed}:{index}")
    all_nodes, all_edges = _curriculum_nodes()
    grade = rng.randint(7, 12)
    target_ids = {node["id"] for node in all_nodes if node["grade"] == grade}
    prerequisites = {}
    for edge in all_edges:
        prerequisites.setdefault(edge["to"], []).append(edge["from"])
    included = set(target_ids)
    pending = list(target_ids)
    while pending:
        current = pending.pop()
        for prerequisite in prerequisites.get(current, []):
            if prerequisite not in included:
                included.add(prerequisite)
                pending.append(prerequisite)

    ability = rng.betavariate(2.4, 2.0)
    engagement = rng.betavariate(2.2, 1.8)
    mastery_by_id = {}
    items = []
    for node in (item for item in all_nodes if item["id"] in included):
        prerequisite_mastery = [
            mastery_by_id.get(skill_id, 0.0)
            for skill_id in prerequisites.get(node["id"], [])
        ]
        foundation_bonus = max(0, grade - node["grade"]) * 0.07
        dependency_penalty = 0.22 if prerequisite_mastery and min(prerequisite_mastery) < 0.45 else 0
        mastery = max(0.0, min(
            1.0,
            ability + foundation_bonus - node["difficulty"] * 0.35
            - dependency_penalty + rng.gauss(0, 0.13),
        ))
        observed = rng.random() < 0.35 + engagement * 0.55
        mastery_by_id[node["id"]] = mastery if observed else 0.0
        blocked_by = sorted(
            skill_id for skill_id in prerequisites.get(node["id"], [])
            if mastery_by_id.get(skill_id, 0) < 0.75
        )
        if observed and mastery >= 0.75:
            status = "review_due" if rng.random() < 0.12 else "mastered"
        elif blocked_by:
            status = "blocked"
        elif observed and mastery >= 0.45:
            status = "learning"
        elif observed:
            status = "gap"
        else:
            status = "ready"
        priority = min(
            1.0,
            STATUS_PRIORITY[status] + node["importance"] * 0.07 + node["difficulty"] * 0.03,
        )
        items.append({
            **node, "is_target_grade": node["grade"] == grade,
            "mastery": round(mastery if observed else 0.0, 4),
            "confidence": round((0.45 + engagement * 0.5) if observed else 0.0, 4),
            "status": status, "blocked_by": blocked_by,
            "priority_score": round(priority, 4),
        })

    start = date(2026, 1, 5) + timedelta(days=index % 365)
    config = PlannerConfig(
        start_date=start,
        target_date=start + timedelta(days=rng.randint(14, 60)),
        weekday_minutes=rng.choice((20, 30, 40, 50, 60)),
        weekend_minutes=rng.choice((30, 45, 60, 90)),
        max_skills=rng.randint(8, 24),
    )
    outcomes = {
        item["id"]: _simulate_outcome(item, ability, engagement, config, rng)
        for item in items
    }
    total_capacity = sum(
        config.weekend_minutes if day.weekday() >= 5 else config.weekday_minutes
        for day in (
            config.start_date + timedelta(days=offset)
            for offset in range((config.target_date - config.start_date).days + 1)
        )
    )
    selection_limit = min(
        config.max_skills,
        max(3, total_capacity // 50),
    )
    actionable = [
        item for item in items
        if item["status"] != "mastered" and not item["blocked_by"]
    ]
    selected = {
        item["id"]
        for item in sorted(
            actionable,
            key=lambda item: (-outcomes[item["id"]]["expected_utility"], item["id"]),
        )[:selection_limit]
    }
    return {
        "student_id": f"sim-{index:06d}", "grade": grade,
        "ability": round(ability, 4), "engagement": round(engagement, 4),
        "config": config, "items": items, "selected": selected, "outcomes": outcomes,
    }


def simulation_rows(student_count, seed=42):
    for index in range(student_count):
        student = simulate_student(index, seed)
        for item in student["items"]:
            outcome = student["outcomes"][item["id"]]
            yield {
                "student_id": student["student_id"],
                "skill_id": item["id"],
                "features": encode_skill_state(item),
                "selected": float(item["id"] in student["selected"]),
                "priority": float(outcome["expected_utility"]),
                "feature_schema_version": FEATURE_SCHEMA_VERSION,
                "dataset_version": DATASET_VERSION,
                "status": item["status"],
                "is_blocked": bool(item["blocked_by"]),
                "simulated_outcome": outcome,
            }


def write_dataset(path, student_count, seed=42):
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    opener = gzip.open if output.suffix == ".gz" else open
    with opener(output, "wt", encoding="utf-8") as target:
        for row in simulation_rows(student_count, seed):
            target.write(json.dumps(row, ensure_ascii=False) + "\n")
    return output


def dataset_statistics(path):
    rows = selected = completed = 0
    utility_sum = gain_sum = 0.0
    students = set()
    path = Path(path)
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as source:
        for line in source:
            row = json.loads(line)
            rows += 1
            students.add(row["student_id"])
            selected += int(row["selected"])
            completed += int(row["simulated_outcome"]["completed"])
            utility_sum += float(row["priority"])
            gain_sum += float(row["simulated_outcome"]["realized_mastery_gain"])
    return {
        "dataset_version": DATASET_VERSION,
        "students": len(students),
        "rows": rows,
        "selection_rate": round(selected / rows, 4) if rows else 0.0,
        "completion_rate": round(completed / rows, 4) if rows else 0.0,
        "mean_expected_utility": round(utility_sum / rows, 4) if rows else 0.0,
        "mean_realized_mastery_gain": round(gain_sum / rows, 4) if rows else 0.0,
    }


def main():
    parser = argparse.ArgumentParser(description="Generate an outcome-oriented PathNet dataset")
    parser.add_argument("--students", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", default="ml/artifacts/synthetic-outcomes-v2.jsonl.gz")
    args = parser.parse_args()
    if not 1 <= args.students <= 1_000_000:
        parser.error("--students must be in 1..1000000")
    path = write_dataset(args.output, args.students, args.seed)
    print(json.dumps({"dataset": str(path), "seed": args.seed, **dataset_statistics(path)}))


if __name__ == "__main__":
    main()
