from pathlib import Path
from time import perf_counter


class PathNetUnavailable(RuntimeError):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


_MODEL_CACHE = {}


def _resolved_path(model_path):
    path = Path(model_path)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[1] / path
    return path.resolve()


def load_pathnet(model_path):
    path = _resolved_path(model_path)
    if not path.is_file():
        raise PathNetUnavailable("model_not_found")
    modified_at = path.stat().st_mtime_ns
    cached = _MODEL_CACHE.get(str(path))
    if cached and cached["modified_at"] == modified_at:
        return cached["model"], cached["version"]
    try:
        import torch
        from ml.features import FEATURE_NAMES
        from ml.pathnet import PathNet
    except (ImportError, RuntimeError) as error:
        raise PathNetUnavailable("torch_unavailable") from error
    try:
        checkpoint = torch.load(path, map_location="cpu", weights_only=True)
        if checkpoint.get("feature_names") != FEATURE_NAMES:
            raise PathNetUnavailable("feature_schema_mismatch")
        model = PathNet()
        model.load_state_dict(checkpoint["model_state_dict"], strict=True)
        model.eval()
        version = str(checkpoint.get("model_version", "pathnet-unknown"))
    except PathNetUnavailable:
        raise
    except (KeyError, TypeError, ValueError, RuntimeError) as error:
        raise PathNetUnavailable("invalid_checkpoint") from error
    _MODEL_CACHE[str(path)] = {
        "modified_at": modified_at,
        "model": model,
        "version": version,
    }
    return model, version


def score_curriculum_items(items, model_path):
    started_at = perf_counter()
    model, version = load_pathnet(model_path)
    try:
        import torch
        from ml.features import encode_skill_state

        candidates = [item for item in items if item["status"] != "mastered"]
        if not candidates:
            return {"model_version": version, "latency_ms": 0.0, "scores": []}
        features = torch.tensor(
            [encode_skill_state(item) for item in candidates], dtype=torch.float32
        )
        with torch.inference_mode():
            output = model(features)
            probabilities = torch.sigmoid(output["selection_logits"]).tolist()
            priorities = output["priority"].tolist()
    except (KeyError, TypeError, ValueError, RuntimeError) as error:
        raise PathNetUnavailable("inference_failed") from error
    scores = [
        {
            "skill_id": item["id"],
            "selection_probability": round(float(probability), 6),
            "predicted_priority": round(float(priority), 6),
        }
        for item, probability, priority in zip(candidates, probabilities, priorities)
    ]
    return {
        "model_version": version,
        "latency_ms": round((perf_counter() - started_at) * 1000, 3),
        "scores": scores,
    }


def compare_shadow_ranking(
    plan,
    curriculum_state,
    model_path,
    top_k=20,
    inference=None,
):
    inference = inference or score_curriculum_items(curriculum_state["items"], model_path)
    deterministic_ids = []
    for day in plan["days"]:
        for item in day["items"]:
            if item["activity"] == "spaced_review" or item["skill_id"] in deterministic_ids:
                continue
            deterministic_ids.append(item["skill_id"])
    scores_by_skill = {item["skill_id"]: item for item in inference["scores"]}
    prerequisites = {item["id"]: set() for item in curriculum_state["items"]}
    for edge in curriculum_state.get("edges", []):
        prerequisites.setdefault(edge["to"], set()).add(edge["from"])
    completed = {
        item["id"] for item in curriculum_state["items"] if item["mastery"] >= 0.75
    }
    remaining = {
        item["id"] for item in curriculum_state["items"]
        if item["status"] != "mastered" and item["id"] in scores_by_skill
    }
    model_ids = []
    selected_ids = set()
    while remaining:
        eligible = [
            skill_id for skill_id in remaining
            if prerequisites.get(skill_id, set()) <= (completed | selected_ids)
        ]
        if not eligible:
            break
        selected = min(
            eligible,
            key=lambda skill_id: (
                -scores_by_skill[skill_id]["selection_probability"],
                -scores_by_skill[skill_id]["predicted_priority"],
                skill_id,
            ),
        )
        model_ids.append(selected)
        selected_ids.add(selected)
        remaining.remove(selected)
    comparison_size = min(top_k, len(deterministic_ids), len(model_ids))
    deterministic_top = deterministic_ids[:comparison_size]
    model_top = model_ids[:comparison_size]
    overlap = len(set(deterministic_top) & set(model_top))
    return {
        "model_version": inference["model_version"],
        "latency_ms": inference["latency_ms"],
        "candidate_count": len(inference["scores"]),
        "comparison_size": comparison_size,
        "overlap_at_k": round(overlap / comparison_size, 4) if comparison_size else 1.0,
        "deterministic_top_skill_ids": deterministic_top[:10],
        "model_top_skill_ids": model_top[:10],
    }
