import argparse
import json
import math
from collections import defaultdict
from pathlib import Path
from time import perf_counter

from ml.simulator import _curriculum_nodes, simulate_student
from services.pathnet_inference import compare_shadow_ranking, score_curriculum_items
from services.planner import generate_deterministic_plan


BENCHMARK_VERSION = "pathnet-offline-holdout-v1"


def _percentile(values, percentile):
    if not values:
        return None
    ordered = sorted(values)
    index = min(len(ordered) - 1, math.ceil(percentile * len(ordered)) - 1)
    return round(ordered[max(index, 0)], 4)


def _empty_bucket():
    return {
        "plans": 0,
        "overlaps": [],
        "latencies": [],
        "priority_absolute_error": 0.0,
        "priority_rows": 0,
        "true_positive": 0,
        "false_positive": 0,
        "false_negative": 0,
        "true_negative": 0,
    }


def _summarize(bucket):
    true_positive = bucket["true_positive"]
    false_positive = bucket["false_positive"]
    false_negative = bucket["false_negative"]
    true_negative = bucket["true_negative"]
    precision = true_positive / max(true_positive + false_positive, 1)
    recall = true_positive / max(true_positive + false_negative, 1)
    f1 = 2 * precision * recall / max(precision + recall, 1e-9)
    classified = true_positive + false_positive + false_negative + true_negative
    return {
        "plans": bucket["plans"],
        "mean_overlap_at_k": round(
            sum(bucket["overlaps"]) / max(len(bucket["overlaps"]), 1), 4
        ),
        "overlap_p10": _percentile(bucket["overlaps"], 0.10),
        "overlap_p50": _percentile(bucket["overlaps"], 0.50),
        "overlap_p90": _percentile(bucket["overlaps"], 0.90),
        "mean_latency_ms": round(
            sum(bucket["latencies"]) / max(len(bucket["latencies"]), 1), 2
        ),
        "latency_p50_ms": _percentile(bucket["latencies"], 0.50),
        "latency_p95_ms": _percentile(bucket["latencies"], 0.95),
        "latency_p99_ms": _percentile(bucket["latencies"], 0.99),
        "selection_accuracy": round(
            (true_positive + true_negative) / max(classified, 1), 4
        ),
        "selection_precision": round(precision, 4),
        "selection_recall": round(recall, 4),
        "selection_f1": round(f1, 4),
        "priority_mae": round(
            bucket["priority_absolute_error"] / max(bucket["priority_rows"], 1), 4
        ),
        "confusion_matrix": [
            [true_negative, false_positive],
            [false_negative, true_positive],
        ],
    }


def _record(bucket, student, inference, comparison):
    scores_by_skill = {score["skill_id"]: score for score in inference["scores"]}
    bucket["plans"] += 1
    bucket["overlaps"].append(comparison["overlap_at_k"])
    bucket["latencies"].append(inference["latency_ms"])
    for item in student["items"]:
        score = scores_by_skill.get(item["id"])
        if score is None:
            continue
        expected = item["id"] in student["selected"]
        predicted = score["selection_probability"] >= 0.5
        if expected and predicted:
            bucket["true_positive"] += 1
        elif expected:
            bucket["false_negative"] += 1
        elif predicted:
            bucket["false_positive"] += 1
        else:
            bucket["true_negative"] += 1
        expected_priority = student["outcomes"][item["id"]]["expected_utility"]
        bucket["priority_absolute_error"] += abs(
            score["predicted_priority"] - expected_priority
        )
        bucket["priority_rows"] += 1


def run_benchmark(model_path, plans=1000, seed=20260818, top_k=20, progress=True):
    if not 1 <= plans <= 1_000_000:
        raise ValueError("plans must be in 1..1000000")
    all_nodes, all_edges = _curriculum_nodes()
    del all_nodes
    global_bucket = _empty_bucket()
    grade_buckets = defaultdict(_empty_bucket)
    failures = defaultdict(int)
    model_version = None
    started_at = perf_counter()

    # Load the checkpoint before timing individual plans, matching a warm API worker.
    score_curriculum_items(simulate_student(0, seed)["items"], model_path)

    for index in range(plans):
        student = simulate_student(index, seed)
        included_ids = {item["id"] for item in student["items"]}
        state = {
            "subject_id": "mathematics",
            "target_grade": student["grade"],
            "items": student["items"],
            "edges": [
                edge for edge in all_edges
                if edge["from"] in included_ids and edge["to"] in included_ids
            ],
        }
        try:
            plan = generate_deterministic_plan(state, student["config"])
            inference = score_curriculum_items(student["items"], model_path)
            comparison = compare_shadow_ranking(
                plan,
                state,
                model_path,
                top_k=top_k,
                inference=inference,
            )
            model_version = inference["model_version"]
            _record(global_bucket, student, inference, comparison)
            _record(grade_buckets[student["grade"]], student, inference, comparison)
        except Exception as error:  # Report every failed plan without hiding the batch.
            failures[type(error).__name__] += 1
        if progress and ((index + 1) % 50 == 0 or index + 1 == plans):
            elapsed = perf_counter() - started_at
            rate = (index + 1) / max(elapsed, 1e-9)
            eta = (plans - index - 1) / max(rate, 1e-9)
            print(
                f"\rPlans {index + 1}/{plans} | {rate:.1f}/s | ETA {eta:.1f}s",
                end="",
                flush=True,
            )
    if progress:
        print()

    return {
        "benchmark_version": BENCHMARK_VERSION,
        "model_version": model_version,
        "model_path": str(Path(model_path)),
        "seed": seed,
        "requested_plans": plans,
        "scored_plans": global_bucket["plans"],
        "failed_plans": sum(failures.values()),
        "failure_codes": dict(sorted(failures.items())),
        "top_k": top_k,
        "elapsed_seconds": round(perf_counter() - started_at, 3),
        "metrics": _summarize(global_bucket),
        "by_grade": {
            str(grade): _summarize(bucket)
            for grade, bucket in sorted(grade_buckets.items())
        },
    }


def main():
    parser = argparse.ArgumentParser(description="Benchmark PathNet on unseen simulated plans")
    parser.add_argument("--model", required=True)
    parser.add_argument("--plans", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=20260818)
    parser.add_argument("--top-k", type=int, default=20)
    parser.add_argument(
        "--output",
        default="ml/artifacts/pathnet-v2-holdout-1000-report.json",
    )
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()
    report = run_benchmark(
        args.model,
        plans=args.plans,
        seed=args.seed,
        top_k=args.top_k,
        progress=not args.quiet,
    )
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"report": str(output), **report}, ensure_ascii=False))


if __name__ == "__main__":
    main()
