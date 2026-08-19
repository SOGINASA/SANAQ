import uuid

from flask import g, jsonify


def request_id():
    return getattr(g, "request_id", str(uuid.uuid4()))


def success(data=None, status=200, meta=None):
    response_meta = {"request_id": request_id()}
    if meta:
        response_meta.update(meta)
    return jsonify({"data": data if data is not None else {}, "meta": response_meta}), status


def api_error(code, message, status, details=None):
    # Human-readable copy belongs to the client locale. Keep ``message`` in the
    # signature while routes migrate, but never expose its server-language text.
    payload = {
        "code": code,
        "message": code,
        "message_code": code,
        "request_id": request_id(),
    }
    if details:
        payload["details"] = [
            {key: value for key, value in detail.items() if key != "message"}
            | {"code": detail.get("code", code)}
            if isinstance(detail, dict) else detail
            for detail in details
        ]
    return jsonify({"error": payload}), status

