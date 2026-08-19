from flask import Blueprint, current_app
from sqlalchemy import text

from models import db
from services.ai.client_factory import create_ai_client
from services.ai.errors import AIProviderError
from utils.responses import api_error, success


system_bp = Blueprint("system", __name__)


@system_bp.get("/health")
def health():
    return success({"status": "ok"})


@system_bp.get("/ready")
def ready():
    provider = str(current_app.config["AI_PROVIDER"]).strip().lower()
    checks = {
        "database": "ok",
        "pathnet": "disabled",
        "ai": f"unavailable:{provider}",
    }
    try:
        db.session.execute(text("SELECT 1"))
    except Exception:
        current_app.logger.exception("Readiness database check failed")
        return api_error("SERVICE_UNAVAILABLE", "База данных недоступна", 503)
    try:
        ai_client = create_ai_client(current_app.config)
        if ai_client.health():
            checks["ai"] = f"ok:{provider}"
    except AIProviderError as error:
        current_app.logger.warning("Readiness AI configuration check failed: %s", error)
    except Exception as error:
        current_app.logger.warning(
            "Readiness AI provider check failed: %s", type(error).__name__
        )
    if current_app.config["PATHNET_MODE"] in {"shadow", "canary", "active"}:
        try:
            from services.pathnet_inference import load_pathnet

            _model, version = load_pathnet(current_app.config["PATHNET_MODEL_PATH"])
            checks["pathnet"] = f"ok:{version}"
        except Exception as error:
            current_app.logger.exception("Readiness PathNet check failed", exc_info=error)
            return api_error("SERVICE_UNAVAILABLE", "PathNet недоступен", 503)
    return success({
        "status": "ready" if checks["ai"].startswith("ok:") else "degraded",
        "checks": checks,
    })


@system_bp.get("/meta")
def meta():
    return success({
        "name": "SANAQ",
        "api_version": current_app.config["API_VERSION"],
        "supported_locales": list(current_app.config["SUPPORTED_LOCALES"]),
        "default_locale": current_app.config["DEFAULT_LOCALE"],
        "data_mode": current_app.config["DATA_MODE"],
        "feature_flags": {
            "auth": True,
            "profiles": True,
            "catalog": True,
            "diagnostics": True,
            "learning_paths": True,
            "learning_content": True,
            "task_attempts": True,
            "progress": True,
            "knowledge_map": True,
            "ai_tutor": True,
            "ai_provider": current_app.config["AI_PROVIDER"],
            "ai_model": current_app.config["AI_MODEL"],
            "teacher_dashboard": True,
        },
    })
