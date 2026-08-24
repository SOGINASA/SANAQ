import os
from datetime import timedelta
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent
DATABASE_DIR = BACKEND_DIR / "database"


def _as_bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _cors_origins():
    raw = os.environ.get("CORS_ORIGINS")
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    return ["http://localhost:3000", "http://127.0.0.1:3000"]


class Config:
    API_VERSION = "1.0.0"
    API_PREFIX = "/api/v1"
    SUPPORTED_LOCALES = ("ru", "kk", "en")
    DEFAULT_LOCALE = os.environ.get("DEFAULT_LOCALE", "ru")
    DATA_MODE = os.environ.get("DATA_MODE", "demo_seed")

    AI_PROVIDER = os.environ.get("AI_PROVIDER", "ollama")
    AI_BASE_URL = os.environ.get("AI_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    AI_API_KEY = os.environ.get("AI_API_KEY", "")
    AI_MODEL = os.environ.get("AI_MODEL", "qwen3:8b")
    AI_PROMPT_VERSION = os.environ.get("AI_PROMPT_VERSION", "sana-tutor-v1")
    AI_TIMEOUT_SECONDS = float(os.environ.get("AI_TIMEOUT_SECONDS", "60"))
    AI_TEMPERATURE = float(os.environ.get("AI_TEMPERATURE", "0.3"))
    AI_MAX_TOKENS = int(os.environ.get("AI_MAX_TOKENS", "500"))
    AI_CONTEXT_TOKENS = int(os.environ.get("AI_CONTEXT_TOKENS", "8192"))
    AI_THINKING = _as_bool("AI_THINKING", False)
    AI_RATE_LIMIT_PER_MINUTE = int(os.environ.get("AI_RATE_LIMIT_PER_MINUTE", "10"))
    AI_DAILY_TOKEN_LIMIT = int(os.environ.get("AI_DAILY_TOKEN_LIMIT", "20000"))

    PATHNET_MODE = os.environ.get("PATHNET_MODE", "off").strip().lower()
    PATHNET_MODEL_PATH = os.environ.get(
        "PATHNET_MODEL_PATH",
        str(BACKEND_DIR / "ml" / "artifacts" / "pathnet-v2-outcomes-notebook.pt"),
    )
    PATHNET_TOP_K = int(os.environ.get("PATHNET_TOP_K", "20"))
    PATHNET_CANARY_PERCENT = int(os.environ.get("PATHNET_CANARY_PERCENT", "0"))

    SECRET_KEY = os.environ.get("SECRET_KEY", "sanaq-development-secret-key-only")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or (
        f"sqlite:///{(DATABASE_DIR / 'sanaq.db').as_posix()}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    AUTO_CREATE_DB = _as_bool("AUTO_CREATE_DB", True)
    MIGRATE_RUNTIME_SCHEMA = _as_bool("MIGRATE_RUNTIME_SCHEMA", True)
    SEED_DEMO_DATA = _as_bool("SEED_DEMO_DATA", True)

    CORS_ORIGINS = _cors_origins()

    FRONTEND_URL = os.environ.get("FRONTEND_URL", CORS_ORIGINS[0]).rstrip("/")
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "")
    OAUTH_LOGIN_CODE_EXPIRES = timedelta(minutes=2)

    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "sanaq-development-jwt-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ["headers", "cookies"]
    JWT_REFRESH_COOKIE_PATH = "/api/v1/auth"
    JWT_COOKIE_SECURE = _as_bool("JWT_COOKIE_SECURE", False)
    JWT_COOKIE_SAMESITE = "Lax"
    JWT_COOKIE_CSRF_PROTECT = False


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)
    JWT_SECRET_KEY = "sanaq-testing-jwt-secret-key-32-bytes"
    AUTO_CREATE_DB = False
    SEED_DEMO_DATA = False
    AI_PROVIDER = "ollama"
    AI_BASE_URL = "http://127.0.0.1:1"
    AI_API_KEY = ""
    AI_TIMEOUT_SECONDS = 0.1
    PATHNET_MODE = "off"
    PATHNET_CANARY_PERCENT = 0


class ProductionConfig(Config):
    DEBUG = False
    DATA_MODE = os.environ.get("DATA_MODE", "production")
    AUTO_CREATE_DB = _as_bool("AUTO_CREATE_DB", False)
    SEED_DEMO_DATA = _as_bool("SEED_DEMO_DATA", False)
    JWT_COOKIE_SECURE = _as_bool("JWT_COOKIE_SECURE", True)


CONFIG_BY_ENV = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config():
    return CONFIG_BY_ENV.get(os.environ.get("FLASK_ENV", "development"), DevelopmentConfig)
