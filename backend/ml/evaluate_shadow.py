import argparse
import json

from app import create_app
from models import db
from services.pathnet_metrics import evaluate_shadow_readiness, shadow_metrics


def main():
    parser = argparse.ArgumentParser(description="Evaluate PathNet shadow readiness")
    parser.add_argument("--minimum-samples", type=int, default=1000)
    parser.add_argument("--minimum-overlap", type=float, default=0.65)
    parser.add_argument("--maximum-failure-rate", type=float, default=0.01)
    parser.add_argument("--maximum-latency-ms", type=float, default=100)
    parser.add_argument("--model-version")
    args = parser.parse_args()
    app = create_app()
    with app.app_context():
        result = evaluate_shadow_readiness(
            shadow_metrics(args.model_version),
            minimum_samples=args.minimum_samples,
            minimum_overlap=args.minimum_overlap,
            maximum_failure_rate=args.maximum_failure_rate,
            maximum_latency_ms=args.maximum_latency_ms,
        )
        db.session.remove()
    print(json.dumps(result, ensure_ascii=False))
    raise SystemExit(0 if result["ready"] else 1)


if __name__ == "__main__":
    main()
