from pathlib import Path

from config import _webauthn_origins


ROOT = Path(__file__).resolve().parents[2]


def test_webauthn_origin_does_not_include_public_url_path(monkeypatch):
    monkeypatch.delenv("WEBAUTHN_ORIGINS", raising=False)
    assert _webauthn_origins("https://foodtrack.beast-inside.kz/sanaq") == [
        "https://foodtrack.beast-inside.kz"
    ]


def test_production_compose_uses_groq_without_ollama_service():
    compose = (ROOT / "compose.yaml").read_text(encoding="utf-8")

    assert "AI_PROVIDER: groq" in compose
    assert "AI_API_KEY: ${GROQ_API_KEY:" in compose
    assert "https://api.groq.com/openai/v1" in compose
    assert "llama-3.1-8b-instant" in compose
    assert "  ollama:" not in compose
    assert "ollama_data" not in compose
    assert "SEED_DEMO_DATA: ${SEED_DEMO_DATA:-false}" in compose
    assert "DATA_MODE: ${DATA_MODE:-production}" in compose
    assert 'REACT_APP_SHOW_DEMO_LOGIN: "false"' in compose
    assert not (ROOT / "compose.gpu.yaml").exists()


def test_production_examples_keep_groq_key_out_of_frontend():
    root_env = (ROOT / ".env.production.example").read_text(encoding="utf-8")
    backend_env = (ROOT / "backend" / ".env.production.example").read_text(
        encoding="utf-8"
    )
    frontend_root = ROOT / "frontend"
    frontend_files = list((frontend_root / "src").rglob("*.js"))
    frontend_files += list((frontend_root / "src").rglob("*.jsx"))
    frontend_files += [
        frontend_root / ".env.example",
        frontend_root / "Dockerfile",
        frontend_root / "package.json",
    ]
    frontend_text = "\n".join(
        path.read_text(encoding="utf-8", errors="ignore") for path in frontend_files
    )

    assert "GROQ_API_KEY=" in root_env
    assert "GROQ_API_KEY=" in backend_env
    assert "PATHNET_MODE=shadow" in root_env
    assert "PATHNET_CANARY_PERCENT=0" in root_env
    assert "SEED_DEMO_DATA=false" in root_env
    assert "DATA_MODE=production" in root_env
    assert "GROQ_API_KEY" not in frontend_text
    assert "AI_API_KEY" not in frontend_text
    assert "gsk_" not in frontend_text


def test_production_frontend_hides_demo_login_by_default():
    dockerfile = (ROOT / "frontend" / "Dockerfile").read_text(encoding="utf-8")
    login_page = (
        ROOT / "frontend" / "src" / "pages" / "auth" / "LoginPage.jsx"
    ).read_text(encoding="utf-8")

    assert "ARG REACT_APP_SHOW_DEMO_LOGIN=false" in dockerfile
    assert "REACT_APP_SHOW_DEMO_LOGIN === 'true'" in login_page


def test_google_oauth_http_client_is_installed_in_all_backend_images():
    development = (ROOT / "backend" / "requirements.txt").read_text(encoding="utf-8")
    production = (ROOT / "backend" / "requirements-production.txt").read_text(
        encoding="utf-8"
    )

    assert "requests==2.34.2" in development
    assert "requests==2.34.2" in production


def test_sanaq_uses_an_isolated_session_cookie():
    backend_compose = (ROOT / "backend" / "docker-compose.yml").read_text(
        encoding="utf-8"
    )
    root_compose = (ROOT / "compose.yaml").read_text(encoding="utf-8")

    assert "SESSION_COOKIE_NAME: ${SESSION_COOKIE_NAME:-sanaq_session}" in backend_compose
    assert "SESSION_COOKIE_SAMESITE: ${SESSION_COOKIE_SAMESITE:-Lax}" in backend_compose
    assert "SESSION_COOKIE_PATH: ${SESSION_COOKIE_PATH:-/}" in backend_compose
    assert "JWT_REFRESH_COOKIE_PATH: ${JWT_REFRESH_COOKIE_PATH:-/api/v1/auth}" in backend_compose
    assert "SESSION_COOKIE_NAME: ${SESSION_COOKIE_NAME:-sanaq_session}" in root_compose
    assert "SESSION_COOKIE_SAMESITE: ${SESSION_COOKIE_SAMESITE:-Lax}" in root_compose
    assert "SESSION_COOKIE_PATH: ${SESSION_COOKIE_PATH:-/}" in root_compose
    assert "JWT_REFRESH_COOKIE_PATH: ${JWT_REFRESH_COOKIE_PATH:-/api/v1/auth}" in root_compose


def test_checked_pathnet_checkpoint_is_packaged_for_production():
    checkpoint = ROOT / "backend" / "ml" / "artifacts" / "pathnet-v2-outcomes-notebook.pt"
    dockerfile = (ROOT / "backend" / "Dockerfile").read_text(encoding="utf-8")
    compose = (ROOT / "compose.yaml").read_text(encoding="utf-8")

    assert checkpoint.is_file()
    assert checkpoint.stat().st_size > 0
    assert "pathnet-v2-outcomes-notebook.pt" in dockerfile
    assert "/app/ml/artifacts/pathnet-v2-outcomes-notebook.pt" in compose
