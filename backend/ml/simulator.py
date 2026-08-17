import argparse
import json
import random
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path

from ml.features import FEATURE_NAMES, encode_skill_state
from services.curriculum import build_curriculum_edges, load_math_curriculum
from services.planner import PlannerConfig, generate_deterministic_plan


STATUS_PRIORITY = {
    "review_due": 0.90, "gap": 0.82, "learning": 0.70,
    "ready": 0.58, "blocked": 0.10, "mastered": 0.0,
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
    state = {"subject_id": "mathematics", "target_grade": grade, "items": items}
    plan = generate_deterministic_plan(state, config)
    selected = {
        item["skill_id"]
        for day in plan["days"]
        for item in day["items"]
        if item["activity"] != "spaced_review"
    }
    return {
        "student_id": f"sim-{index:06d}", "grade": grade,
        "ability": round(ability, 4), "engagement": round(engagement, 4),
        "config": config, "items": items, "selected": selected,
    }


def simulation_rows(student_count, seed=42):
    for index in range(student_count):
        student = simulate_student(index, seed)
        for item in student["items"]:
            yield {
                "student_id": student["student_id"],
                "skill_id": item["id"],
                "features": encode_skill_state(item),
                "selected": float(item["id"] in student["selected"]),
                "priority": float(item["priority_score"]),
                "feature_schema": FEATURE_NAMES,
            }


def write_dataset(path, student_count, seed=42):
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as target:
        for row in simulation_rows(student_count, seed):
            target.write(json.dumps(row, ensure_ascii=False) + "\n")
    return output


def main():
    parser = argparse.ArgumentParser(description="Generate a deterministic PathNet dataset")
    parser.add_argument("--students", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", default="ml/artifacts/simulated_students.jsonl")
    args = parser.parse_args()
    if not 1 <= args.students <= 1_000_000:
        parser.error("--students must be in 1..1000000")
    path = write_dataset(args.output, args.students, args.seed)
    print(f"dataset={path} students={args.students} seed={args.seed}")


if __name__ == "__main__":
    main()
