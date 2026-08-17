from flask import current_app, request


def requested_locale():
    raw = request.headers.get("Accept-Language", "").split(",")[0].split("-")[0].lower()
    if raw in current_app.config["SUPPORTED_LOCALES"]:
        return raw
    return current_app.config["DEFAULT_LOCALE"]


def localized(value, locale=None):
    if not isinstance(value, dict):
        return value
    selected = locale or requested_locale()
    return value.get(selected) or value.get("ru") or next(iter(value.values()), "")

