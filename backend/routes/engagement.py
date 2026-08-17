from datetime import datetime, timedelta, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from models import Assignment, Attempt, ClassEnrollment, KnowledgeState, Notification, Skill, Task, User, db
from services.events import record_learning_event
from utils.decorators import roles_required
from utils.localization import localized
from utils.responses import api_error, success


engagement_bp = Blueprint("engagement", __name__)


def _notification_payload(item):
    return {
        "id": item.id, "title": item.title, "body": item.body, "link": item.link,
        "read": item.read_at is not None, "created_at": item.created_at.isoformat(),
    }


def _as_utc(value):
    if value and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _reminder_copy(locale, kind, name, due_at=None):
    language = locale if locale in {"ru", "kk", "en"} else "ru"
    if kind == "review":
        return {
            "ru": ("Пора повторить", f"Закрепите навык «{name}», пока знания свежи."),
            "kk": ("Қайталау уақыты", f"«{name}» дағдысын бекітіп алыңыз."),
            "en": ("Time to review", f"Reinforce “{name}” while it is still fresh."),
        }[language]
    return {
        "ru": ("Срок задания приближается", f"«{name}» нужно выполнить до {due_at:%d.%m, %H:%M}."),
        "kk": ("Тапсырма мерзімі жақындады", f"«{name}» тапсырмасын {due_at:%d.%m, %H:%M} дейін орындаңыз."),
        "en": ("Assignment due soon", f"Complete “{name}” by {due_at:%d %b, %H:%M}."),
    }[language]


def _sync_reminder_notifications(user_id):
    """Materialize due reminders on notification reads, without creating duplicates."""
    user = db.session.get(User, user_id)
    if not user or user.role != "student":
        return
    preferences = dict(user.preferences or {}).get("notifications", {})
    reviews_enabled = bool(preferences.get("reviews", True))
    deadlines_enabled = bool(preferences.get("deadlines", True))
    now = datetime.now(timezone.utc)
    created = False

    if reviews_enabled:
        states = db.session.scalars(
            db.select(KnowledgeState).where(
                KnowledgeState.student_id == user_id,
                KnowledgeState.next_review_at.is_not(None),
                KnowledgeState.next_review_at <= now,
            )
        ).all()
        for state in states:
            task = db.session.scalar(
                db.select(Task).where(Task.skill_id == state.skill_id, Task.is_published.is_(True))
            )
            skill = db.session.get(Skill, state.skill_id)
            if not task or not skill:
                continue
            due_at = _as_utc(state.next_review_at)
            link = f"/student/task/{task.id}?review={state.id}&due={int(due_at.timestamp())}"
            exists = db.session.scalar(
                db.select(Notification.id).where(Notification.user_id == user_id, Notification.link == link)
            )
            if not exists:
                title, body = _reminder_copy(user.locale, "review", localized(skill.name, user.locale))
                db.session.add(Notification(user_id=user_id, title=title, body=body, link=link))
                created = True

    if deadlines_enabled:
        deadline = now + timedelta(days=3)
        assignments = db.session.scalars(
            db.select(Assignment).join(
                ClassEnrollment, ClassEnrollment.class_id == Assignment.class_id
            ).where(
                ClassEnrollment.student_id == user_id,
                Assignment.status == "published",
                Assignment.due_at.is_not(None),
                Assignment.due_at >= now,
                Assignment.due_at <= deadline,
            )
        ).all()
        for assignment in assignments:
            due_at = _as_utc(assignment.due_at)
            link = f"/student/progress?assignment={assignment.id}&due={int(due_at.timestamp())}"
            exists = db.session.scalar(
                db.select(Notification.id).where(Notification.user_id == user_id, Notification.link == link)
            )
            if not exists:
                title, body = _reminder_copy(user.locale, "deadline", assignment.title, due_at)
                db.session.add(Notification(user_id=user_id, title=title, body=body, link=link))
                created = True

    if created:
        db.session.commit()


@engagement_bp.get("/notifications")
@roles_required("student", "teacher", "admin")
def notifications():
    _sync_reminder_notifications(get_jwt_identity())
    items = db.session.scalars(
        db.select(Notification).where(Notification.user_id == get_jwt_identity())
        .order_by(Notification.created_at.desc()).limit(50)
    ).all()
    return success({"items": [_notification_payload(item) for item in items]})


@engagement_bp.get("/notifications/unread-count")
@roles_required("student", "teacher", "admin")
def unread_count():
    count = db.session.scalar(
        db.select(db.func.count()).select_from(Notification).where(
            Notification.user_id == get_jwt_identity(), Notification.read_at.is_(None)
        )
    )
    return success({"count": count})


@engagement_bp.patch("/notifications/<notificationId>/read")
@roles_required("student", "teacher", "admin")
def read_notification(notificationId):
    item = db.session.get(Notification, notificationId)
    if not item or item.user_id != get_jwt_identity():
        return api_error("NOTIFICATION_NOT_FOUND", "Уведомление не найдено", 404)
    item.read_at = datetime.now(timezone.utc)
    db.session.commit()
    return success({"notification": _notification_payload(item)})


@engagement_bp.post("/notifications/read-all")
@roles_required("student", "teacher", "admin")
def read_all_notifications():
    db.session.execute(
        db.update(Notification).where(
            Notification.user_id == get_jwt_identity(), Notification.read_at.is_(None)
        ).values(read_at=datetime.now(timezone.utc))
    )
    db.session.commit()
    return success({"updated": True})


@engagement_bp.get("/notification-preferences")
@roles_required("student", "teacher", "admin")
def notification_preferences():
    user = db.session.get(User, get_jwt_identity())
    preferences = dict(user.preferences or {})
    return success({"preferences": preferences.get("notifications", {"reviews": True, "deadlines": True})})


@engagement_bp.patch("/notification-preferences")
@roles_required("student", "teacher", "admin")
def update_notification_preferences():
    user = db.session.get(User, get_jwt_identity())
    data = request.get_json(silent=True) or {}
    current = dict(user.preferences or {})
    current["notifications"] = {
        "reviews": bool(data.get("reviews", True)), "deadlines": bool(data.get("deadlines", True)),
    }
    user.preferences = current
    if not current["notifications"]["reviews"]:
        db.session.execute(db.delete(Notification).where(
            Notification.user_id == user.id,
            Notification.read_at.is_(None),
            Notification.link.like("/student/task/%?review=%"),
        ))
    if not current["notifications"]["deadlines"]:
        db.session.execute(db.delete(Notification).where(
            Notification.user_id == user.id,
            Notification.read_at.is_(None),
            Notification.link.like("/student/progress?assignment=%"),
        ))
    db.session.commit()
    return success({"preferences": current["notifications"]})


def _activity(student_id):
    attempts = db.session.scalars(
        db.select(Attempt).where(Attempt.student_id == student_id, Attempt.status == "completed")
        .order_by(Attempt.completed_at.desc())
    ).all()
    days = sorted({attempt.completed_at.date() for attempt in attempts if attempt.completed_at}, reverse=True)
    return attempts, days


@engagement_bp.get("/students/me/achievements")
@roles_required("student")
def achievements():
    attempts, days = _activity(get_jwt_identity())
    correct = sum((attempt.score or 0) > 0 for attempt in attempts)
    mastered = db.session.scalar(
        db.select(db.func.count()).select_from(KnowledgeState).where(
            KnowledgeState.student_id == get_jwt_identity(), KnowledgeState.mastery >= 0.8
        )
    )
    items = [
        {"id": "first-step", "title": "Первый шаг", "description": "Завершить первое задание", "earned": len(attempts) >= 1, "progress": min(len(attempts), 1), "target": 1},
        {"id": "five-correct", "title": "Уверенная серия", "description": "Решить пять заданий", "earned": correct >= 5, "progress": min(correct, 5), "target": 5},
        {"id": "mastery", "title": "Навык освоен", "description": "Достичь mastery 80%", "earned": mastered >= 1, "progress": min(mastered, 1), "target": 1},
        {"id": "active-week", "title": "Учебная неделя", "description": "Заниматься в три разных дня", "earned": len(days) >= 3, "progress": min(len(days), 3), "target": 3},
    ]
    return success({"items": items, "earned_count": sum(item["earned"] for item in items)})


@engagement_bp.get("/students/me/streak")
@roles_required("student")
def streak():
    _attempts, days = _activity(get_jwt_identity())
    current = 0
    expected = datetime.now(timezone.utc).date()
    for day in days:
        if day == expected:
            current += 1
            expected = expected.fromordinal(expected.toordinal() - 1)
        elif current == 0 and day == expected.fromordinal(expected.toordinal() - 1):
            current += 1
            expected = day.fromordinal(day.toordinal() - 1)
        else:
            break
    return success({"current": current, "active_days": [day.isoformat() for day in days], "best": len(days)})


def _review_items():
    states = db.session.scalars(
        db.select(KnowledgeState).where(KnowledgeState.student_id == get_jwt_identity())
        .order_by(KnowledgeState.next_review_at)
    ).all()
    items = []
    now = datetime.now(timezone.utc)
    for state in states:
        skill = db.session.get(Skill, state.skill_id)
        task = db.session.scalar(db.select(Task).where(Task.skill_id == state.skill_id, Task.is_published.is_(True)))
        due_at = state.next_review_at
        if due_at and due_at.tzinfo is None:
            due_at = due_at.replace(tzinfo=timezone.utc)
        items.append({
            "id": state.id, "skill_id": state.skill_id, "skill_name": localized(skill.name),
            "task_id": task.id if task else None, "mastery": round(state.mastery, 2),
            "due_at": due_at.isoformat() if due_at else None,
            "due": not due_at or due_at <= now,
        })
    return items


@engagement_bp.get("/reviews/due")
@roles_required("student")
def reviews_due():
    return success({"items": [item for item in _review_items() if item["due"]]})


@engagement_bp.post("/reviews/<reviewId>/start")
@roles_required("student")
def start_review(reviewId):
    item = next((item for item in _review_items() if item["id"] == reviewId), None)
    if not item:
        return api_error("REVIEW_NOT_FOUND", "Повторение не найдено", 404)
    return success({"review": item})


@engagement_bp.post("/reviews/<reviewId>/complete")
@roles_required("student")
def complete_review(reviewId):
    state = db.session.get(KnowledgeState, reviewId)
    if not state or state.student_id != get_jwt_identity():
        return api_error("REVIEW_NOT_FOUND", "Повторение не найдено", 404)
    interval_days = 14 if state.mastery >= 0.8 else 7 if state.mastery >= 0.6 else 3
    state.next_review_at = datetime.now(timezone.utc) + timedelta(days=interval_days)
    record_learning_event(get_jwt_identity(), "review_completed", {
        "skill_id": state.skill_id,
        "mastery": round(state.mastery, 3),
        "next_interval_days": interval_days,
    })
    db.session.commit()
    return success({"completed": True, "next_review_at": state.next_review_at.isoformat()})


@engagement_bp.get("/students/me/review-calendar")
@roles_required("student")
def review_calendar():
    return success({"items": _review_items()})
