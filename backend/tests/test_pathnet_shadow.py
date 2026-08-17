import pytest

torch = pytest.importorskip("torch")

from ml.features import FEATURE_NAMES
from ml.pathnet import PathNet
from models import ProductEvent, db
from services.pathnet_metrics import evaluate_shadow_readiness


def _checkpoint(path):
    torch.save({
        "model_state_dict": PathNet().state_dict(),
        "feature_names": FEATURE_NAMES,
        "model_version": "pathnet-test-v1",
        "metrics": {},
    }, path)


def _request_plan(client, headers):
    return client.post(
        "/api/v1/students/me/study-plan/preview",
        headers=headers,
        json={
            "grade": 9,
            "start_date": "2026-01-05",
            "target_date": "2026-01-20",
            "weekday_minutes": 30,
            "weekend_minutes": 45,
            "max_skills": 5,
        },
    )


def test_pathnet_shadow_scores_without_changing_applied_planner(
    app, client, student_headers, admin_headers, student, tmp_path
):
    model_path = tmp_path / "pathnet.pt"
    _checkpoint(model_path)
    app.config.update(
        PATHNET_MODE="shadow",
        PATHNET_MODEL_PATH=str(model_path),
        PATHNET_TOP_K=5,
    )

    readiness = client.get("/api/v1/ready")
    assert readiness.status_code == 200
    assert readiness.get_json()["data"]["checks"]["pathnet"] == "ok:pathnet-test-v1"

    response = _request_plan(client, student_headers)
    assert response.status_code == 200
    plan = response.get_json()["data"]["study_plan"]
    assert plan["ranking"] == {
        "applied": "deterministic",
        "planner_version": "deterministic-planner-v1",
        "shadow_evaluated": True,
        "shadow_model_version": "pathnet-test-v1",
    }
    event = db.session.scalar(
        db.select(ProductEvent).where(
            ProductEvent.user_id == student.id,
            ProductEvent.event_name == "pathnet_shadow_scored",
        )
    )
    assert 0 <= event.properties["overlap_at_k"] <= 1
    assert event.properties["comparison_size"] == 5

    metrics = client.get("/api/v1/admin/pathnet/metrics", headers=admin_headers)
    assert metrics.status_code == 200
    assert metrics.get_json()["data"]["scored_plans"] == 1
    assert metrics.get_json()["data"]["failed_plans"] == 0


def test_pathnet_shadow_failure_never_breaks_plan(
    app, client, student_headers, student, tmp_path
):
    app.config.update(
        PATHNET_MODE="shadow",
        PATHNET_MODEL_PATH=str(tmp_path / "missing.pt"),
    )
    readiness = client.get("/api/v1/ready")
    assert readiness.status_code == 503

    response = _request_plan(client, student_headers)
    assert response.status_code == 200
    ranking = response.get_json()["data"]["study_plan"]["ranking"]
    assert ranking["applied"] == "deterministic"
    assert ranking["shadow_evaluated"] is False
    assert ranking["shadow_failure_code"] == "model_not_found"
    failure = db.session.scalar(
        db.select(ProductEvent).where(
            ProductEvent.user_id == student.id,
            ProductEvent.event_name == "pathnet_shadow_failed",
        )
    )
    assert failure.properties["failure_code"] == "model_not_found"


def test_shadow_readiness_requires_every_safety_gate():
    metrics = {
        "scored_plans": 1200,
        "mean_overlap_at_k": 0.72,
        "failure_rate": 0.005,
        "mean_latency_ms": 35,
    }
    assert evaluate_shadow_readiness(metrics)["ready"] is True
    metrics["failure_rate"] = 0.05
    result = evaluate_shadow_readiness(metrics)
    assert result["ready"] is False
    assert result["checks"]["failure_rate_acceptable"] is False
