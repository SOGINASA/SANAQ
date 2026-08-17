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
    payload = {
        "code": code,
        "message": message,
        "request_id": request_id(),
    }
    if details:
        payload["details"] = details
    return jsonify({"error": payload}), status

