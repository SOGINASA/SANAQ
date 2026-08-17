from models import ProductEvent, db


def shadow_metrics(model_version=None):
    scored = db.session.scalars(
        db.select(ProductEvent).where(
            ProductEvent.event_name == "pathnet_shadow_scored"
        )
    ).all()
    if model_version:
        scored = [
            item for item in scored
            if item.properties.get("model_version") == model_version
        ]
    failed = db.session.scalars(
        db.select(ProductEvent).where(
            ProductEvent.event_name == "pathnet_shadow_failed"
        )
    ).all()
    if model_version:
        failed = []
    overlaps = [float(item.properties.get("overlap_at_k", 0)) for item in scored]
    latencies = [float(item.properties.get("latency_ms", 0)) for item in scored]
    failure_codes = {}
    for item in failed:
        code = str(item.properties.get("failure_code", "unknown"))
        failure_codes[code] = failure_codes.get(code, 0) + 1
    total = len(scored) + len(failed)
    return {
        "mode": "shadow",
        "model_version_filter": model_version,
        "scored_plans": len(scored),
        "failed_plans": len(failed),
        "failure_rate": round(len(failed) / total, 4) if total else None,
        "mean_overlap_at_k": round(sum(overlaps) / len(overlaps), 4) if overlaps else None,
        "mean_latency_ms": round(sum(latencies) / len(latencies), 2) if latencies else None,
        "failure_codes": failure_codes,
        "model_versions": sorted({
            str(item.properties.get("model_version")) for item in scored
        }),
    }


def evaluate_shadow_readiness(
    metrics,
    minimum_samples=1000,
    minimum_overlap=0.65,
    maximum_failure_rate=0.01,
    maximum_latency_ms=100,
):
    checks = {
        "enough_samples": metrics["scored_plans"] >= minimum_samples,
        "overlap_acceptable": (
            metrics["mean_overlap_at_k"] is not None
            and metrics["mean_overlap_at_k"] >= minimum_overlap
        ),
        "failure_rate_acceptable": (
            metrics["failure_rate"] is not None
            and metrics["failure_rate"] <= maximum_failure_rate
        ),
        "latency_acceptable": (
            metrics["mean_latency_ms"] is not None
            and metrics["mean_latency_ms"] <= maximum_latency_ms
        ),
    }
    return {"ready": all(checks.values()), "checks": checks, "metrics": metrics}
