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
    SUPPORTED_LOCALES = ("ru", "kk")
    DEFAULT_LOCALE = os.environ.get("DEFAULT_LOCALE", "ru")
    DATA_MODE = os.environ.get("DATA_MODE", "demo_seed")

    SECRET_KEY = os.environ.get("SECRET_KEY", "sanaq-development-secret-key-only")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or (
        f"sqlite:///{(DATABASE_DIR / 'sanaq.db').as_posix()}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    AUTO_CREATE_DB = _as_bool("AUTO_CREATE_DB", True)
    SEED_DEMO_DATA = _as_bool("SEED_DEMO_DATA", True)

    CORS_ORIGINS = _cors_origins()

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


class ProductionConfig(Config):
    DEBUG = False
    AUTO_CREATE_DB = _as_bool("AUTO_CREATE_DB", False)
    SEED_DEMO_DATA = _as_bool("SEED_DEMO_DATA", False)
    JWT_COOKIE_SECURE = True


CONFIG_BY_ENV = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config():
    return CONFIG_BY_ENV.get(os.environ.get("FLASK_ENV", "development"), DevelopmentConfig)
