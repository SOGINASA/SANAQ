def test_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.get_json()["data"]["status"] == "ok"
    assert response.headers["X-Request-ID"]


def test_ready(client):
    response = client.get("/api/v1/ready")
    assert response.status_code == 200
    assert response.get_json()["data"]["checks"]["database"] == "ok"
    assert response.get_json()["data"]["checks"]["pathnet"] == "disabled"


def test_meta(client):
    response = client.get("/api/v1/meta")
    assert response.status_code == 200
    assert response.get_json()["data"]["supported_locales"] == ["ru", "kk"]
