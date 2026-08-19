def test_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.get_json()["data"]["status"] == "ok"
    assert response.headers["X-Request-ID"]


from types import SimpleNamespace


def test_ready(client, monkeypatch):
    monkeypatch.setattr(
        "routes.system.create_ai_client",
        lambda _config: SimpleNamespace(health=lambda: True),
    )
    response = client.get("/api/v1/ready")
    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["status"] == "ready"
    assert data["checks"]["database"] == "ok"
    assert data["checks"]["pathnet"] == "disabled"
    assert data["checks"]["ai"] == "ok:ollama"


def test_ready_reports_unavailable_ai_as_degraded(client, monkeypatch):
    monkeypatch.setattr(
        "routes.system.create_ai_client",
        lambda _config: SimpleNamespace(health=lambda: False),
    )
    response = client.get("/api/v1/ready")

    assert response.status_code == 200
    assert response.get_json()["data"]["status"] == "degraded"
    assert response.get_json()["data"]["checks"]["ai"] == "unavailable:ollama"


def test_meta(client):
    response = client.get("/api/v1/meta")
    assert response.status_code == 200
    assert response.get_json()["data"]["supported_locales"] == ["ru", "kk", "en"]
