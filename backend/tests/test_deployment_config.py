from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_production_compose_uses_groq_without_ollama_service():
    compose = (ROOT / "compose.yaml").read_text(encoding="utf-8")

    assert "AI_PROVIDER: groq" in compose
    assert "AI_API_KEY: ${GROQ_API_KEY:" in compose
    assert "https://api.groq.com/openai/v1" in compose
    assert "llama-3.1-8b-instant" in compose
    assert "  ollama:" not in compose
    assert "ollama_data" not in compose
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
    assert "GROQ_API_KEY" not in frontend_text
    assert "AI_API_KEY" not in frontend_text
    assert "gsk_" not in frontend_text


def test_checked_pathnet_checkpoint_is_packaged_for_production():
    checkpoint = ROOT / "backend" / "ml" / "artifacts" / "pathnet-v2-outcomes-notebook.pt"
    dockerfile = (ROOT / "backend" / "Dockerfile").read_text(encoding="utf-8")
    compose = (ROOT / "compose.yaml").read_text(encoding="utf-8")

    assert checkpoint.is_file()
    assert checkpoint.stat().st_size > 0
    assert "pathnet-v2-outcomes-notebook.pt" in dockerfile
    assert "/app/ml/artifacts/pathnet-v2-outcomes-notebook.pt" in compose
