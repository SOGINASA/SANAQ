import re
from pathlib import Path


def _documented_routes():
    contract = Path(__file__).resolve().parents[1] / "API_ROUTES.md"
    text = contract.read_text(encoding="utf-8")
    return {
        (method, path.split("?")[0])
        for method, path in re.findall(
            r"^\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|\s*`([^`]+)`",
            text,
            re.MULTILINE,
        )
    }


def _registered_routes(app):
    routes = []
    for rule in app.url_map.iter_rules():
        if not rule.rule.startswith("/api/v1"):
            continue
        path = rule.rule.removeprefix("/api/v1") or "/"
        path = re.sub(r"<(?:[^:>]+:)?([^>]+)>", r":\1", path)
        for method in rule.methods - {"HEAD", "OPTIONS"}:
            routes.append((method, path))
    return routes


def test_flask_routes_match_api_contract(app):
    registered = _registered_routes(app)
    assert len(registered) == len(set(registered)), "Duplicate Flask routes detected"
    assert set(registered) == _documented_routes()


def test_unimplemented_contract_route_is_explicit(client, student_headers):
    response = client.get("/api/v1/reviews/due", headers=student_headers)
    assert response.status_code == 501
    assert response.get_json()["error"]["code"] == "FEATURE_NOT_IMPLEMENTED"


def test_contract_route_still_enforces_role(client, teacher_headers):
    response = client.post("/api/v1/diagnostics", headers=teacher_headers)
    assert response.status_code == 403
