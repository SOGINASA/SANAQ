"""Registered API-contract routes whose domain logic is not implemented yet.

These endpoints deliberately return 501 instead of pretending that a feature works.
Keeping them registered gives the frontend a stable contract and makes missing work
machine-visible through tests and `/meta` feature flags.
"""

import re

from flask import Blueprint
from flask_jwt_extended import get_jwt, verify_jwt_in_request

from utils.responses import api_error


contract_bp = Blueprint("contract", __name__)

ROUTE_SPECS = [
    ("GET", "/students/:studentId/knowledge-map", "linked teacher/admin"),
    ("POST", "/modules", "teacher/admin"),
    ("PATCH", "/modules/:moduleId", "author/admin"),
    ("DELETE", "/modules/:moduleId", "author/admin"),
    ("POST", "/modules/:moduleId/publish", "author/admin"),
    ("POST", "/lessons", "teacher/admin"),
    ("PATCH", "/lessons/:lessonId", "author/admin"),
    ("POST", "/materials/upload-url", "teacher/admin"),
    ("POST", "/tasks", "teacher/admin"),
    ("PATCH", "/tasks/:taskId", "author/admin"),
    ("POST", "/ai/conversations", "student"),
    ("GET", "/ai/conversations/:conversationId", "owner"),
    ("POST", "/ai/conversations/:conversationId/messages", "owner"),
    ("GET", "/ai/conversations/:conversationId/stream", "owner"),
    ("POST", "/ai/feedback/:feedbackId/report", "user"),
    ("GET", "/reviews/due", "student"),
    ("POST", "/reviews/:reviewId/start", "owner"),
    ("POST", "/reviews/:reviewId/complete", "owner"),
    ("GET", "/students/me/review-calendar", "student"),
    ("GET", "/students/me/goals", "student"),
    ("POST", "/students/me/goals", "student"),
    ("PATCH", "/goals/:goalId", "owner"),
    ("DELETE", "/goals/:goalId", "owner"),
    ("GET", "/students/me/achievements", "student"),
    ("GET", "/students/me/streak", "student"),
    ("GET", "/teachers/me/dashboard", "teacher"),
    ("GET", "/teachers/me/classes", "teacher"),
    ("POST", "/classes", "teacher/admin"),
    ("GET", "/classes/:classId", "linked teacher/admin"),
    ("PATCH", "/classes/:classId", "owner/admin"),
    ("POST", "/classes/:classId/join", "student"),
    ("DELETE", "/classes/:classId/students/:studentId", "owner/admin"),
    ("GET", "/classes/:classId/students", "linked teacher"),
    ("GET", "/classes/:classId/analytics", "linked teacher"),
    ("GET", "/classes/:classId/weak-skills", "linked teacher"),
    ("GET", "/teachers/students/:studentId/progress", "linked teacher"),
    ("POST", "/assignments", "teacher"),
    ("GET", "/assignments", "teacher"),
    ("GET", "/assignments/:assignmentId", "linked user"),
    ("PATCH", "/assignments/:assignmentId", "owner"),
    ("POST", "/assignments/:assignmentId/publish", "owner"),
    ("GET", "/students/me/assignments", "student"),
    ("GET", "/notifications", "user"),
    ("GET", "/notifications/unread-count", "user"),
    ("PATCH", "/notifications/:notificationId/read", "owner"),
    ("POST", "/notifications/read-all", "user"),
    ("GET", "/notification-preferences", "user"),
    ("PATCH", "/notification-preferences", "user"),
    ("GET", "/admin/content/review", "admin"),
    ("POST", "/admin/content/:contentId/approve", "admin"),
    ("POST", "/admin/content/:contentId/reject", "admin"),
    ("GET", "/admin/ai/reports", "admin"),
    ("PATCH", "/admin/ai/reports/:reportId", "admin"),
    ("GET", "/admin/audit-log", "admin"),
    ("POST", "/events/batch", "user"),
]


ROLE_RULES = {
    "student": {"student"},
    "teacher": {"teacher"},
    "admin": {"admin"},
    "teacher/admin": {"teacher", "admin"},
    "linked teacher/admin": {"teacher", "admin"},
    "linked teacher": {"teacher"},
    "author/admin": {"teacher", "admin"},
}


def _flask_path(path):
    return re.sub(r":([A-Za-z_][A-Za-z0-9_]*)", r"<\1>", path)


def _placeholder(method, path, access):
    def view(**_path_params):
        verify_jwt_in_request(locations=["headers"])
        allowed_roles = ROLE_RULES.get(access)
        if allowed_roles and get_jwt().get("role") not in allowed_roles:
            return api_error("FORBIDDEN", "Недостаточно прав", 403)
        return api_error(
            "FEATURE_NOT_IMPLEMENTED",
            "Маршрут зарегистрирован, но бизнес-логика ещё не реализована",
            501,
            {"method": method, "route": path},
        )

    return view


for index, (route_method, route_path, route_access) in enumerate(ROUTE_SPECS):
    contract_bp.add_url_rule(
        _flask_path(route_path),
        endpoint=f"placeholder_{index}",
        view_func=_placeholder(route_method, route_path, route_access),
        methods=[route_method],
    )
