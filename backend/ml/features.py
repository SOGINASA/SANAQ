FEATURE_NAMES = [
    "mastery", "confidence", "difficulty", "importance", "grade_normalized",
    "is_target_grade", "learning_minutes_normalized", "practice_minutes_normalized",
    "blocked_count_normalized", "status_ready", "status_blocked", "status_learning",
    "status_gap", "status_mastered", "status_review_due", "priority_score",
]


def encode_skill_state(item):
    status = item["status"]
    return [
        float(item["mastery"]),
        float(item["confidence"]),
        float(item["difficulty"]),
        float(item["importance"]),
        float(item["grade"]) / 12.0,
        float(bool(item["is_target_grade"])),
        min(float(item["learning_minutes"]) / 120.0, 1.0),
        min(float(item["practice_minutes"]) / 120.0, 1.0),
        min(len(item.get("blocked_by", [])) / 4.0, 1.0),
        float(status == "ready"),
        float(status == "blocked"),
        float(status == "learning"),
        float(status == "gap"),
        float(status == "mastered"),
        float(status == "review_due"),
        float(item["priority_score"]),
    ]
