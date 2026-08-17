import secrets
from datetime import date, datetime, timezone

from flask import Blueprint, Response, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from models import (
    AIReport, AuditLog, ClassEnrollment, Classroom, KnowledgeState, LearningModule,
    MaterialUpload, PrerequisiteEdge, StudentGoal, Topic, db,
)
from services.learning import (
    MASTERY_THRESHOLD,
    available_learning_skills,
    mastery_status,
    prerequisite_ids,
)
from services.events import ALLOWED_EVENTS, EventValidationError, record_learning_event
from utils.decorators import admin_required, roles_required
from utils.localization import localized
from utils.responses import api_error, success


governance_bp = Blueprint("governance", __name__)


def _audit(action, entity_type, entity_id=None, details=None):
    db.session.add(AuditLog(
        actor_id=get_jwt_identity(), action=action, entity_type=entity_type,
        entity_id=entity_id, details=details or {},
    ))


def _goal_payload(goal):
    return {
        "id": goal.id, "title": goal.title, "target_date": goal.target_date.isoformat() if goal.target_date else None,
        "status": goal.status, "created_at": goal.created_at.isoformat(), "updated_at": goal.updated_at.isoformat(),
    }


@governance_bp.get("/students/me/goals")
@roles_required("student")
def list_goals():
    items = db.session.scalars(
        db.select(StudentGoal).where(StudentGoal.student_id == get_jwt_identity(), StudentGoal.status != "archived")
        .order_by(StudentGoal.target_date, StudentGoal.created_at.desc())
    ).all()
    return success({"items": [_goal_payload(item) for item in items]})


@governance_bp.post("/students/me/goals")
@roles_required("student")
def create_goal():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    if not title or len(title) > 200:
        return api_error("VALIDATION_ERROR", "Название цели должно содержать от 1 до 200 символов", 422)
    target_date = None
    if data.get("target_date"):
        try:
            target_date = date.fromisoformat(str(data["target_date"]))
        except ValueError:
            return api_error("VALIDATION_ERROR", "Дата должна быть в формате YYYY-MM-DD", 422)
    goal = StudentGoal(student_id=get_jwt_identity(), title=title, target_date=target_date)
    db.session.add(goal)
    _audit("goal.created", "goal", goal.id, {"title": title})
    db.session.commit()
    return success({"goal": _goal_payload(goal)}, status=201)


def _owned_goal(goal_id):
    goal = db.session.get(StudentGoal, goal_id)
    if not goal or goal.student_id != get_jwt_identity():
        return None, api_error("GOAL_NOT_FOUND", "Цель не найдена", 404)
    return goal, None


@governance_bp.patch("/goals/<goalId>")
@roles_required("student")
def update_goal(goalId):
    goal, error = _owned_goal(goalId)
    if error:
        return error
    data = request.get_json(silent=True) or {}
    if "title" in data:
        title = str(data["title"]).strip()
        if not title or len(title) > 200:
            return api_error("VALIDATION_ERROR", "Некорректное название цели", 422)
        goal.title = title
    if "target_date" in data:
        try:
            goal.target_date = date.fromisoformat(data["target_date"]) if data["target_date"] else None
        except ValueError:
            return api_error("VALIDATION_ERROR", "Дата должна быть в формате YYYY-MM-DD", 422)
    if "status" in data and data["status"] in {"active", "completed"}:
        goal.status = data["status"]
    _audit("goal.updated", "goal", goal.id)
    db.session.commit()
    return success({"goal": _goal_payload(goal)})


@governance_bp.delete("/goals/<goalId>")
@roles_required("student")
def archive_goal(goalId):
    goal, error = _owned_goal(goalId)
    if error:
        return error
    goal.status = "archived"
    _audit("goal.archived", "goal", goal.id)
    db.session.commit()
    return success({"archived": True})


def _student_map(student_id, subject_id):
    skills = available_learning_skills(subject_id)
    states = db.session.scalars(
        db.select(KnowledgeState).where(
            KnowledgeState.student_id == student_id,
            KnowledgeState.skill_id.in_([skill.id for skill in skills]),
        )
    ).all() if skills else []
    by_skill = {state.skill_id: state for state in states}
    nodes = []
    for skill in skills:
        state = by_skill.get(skill.id)
        mastery = state.mastery if state else 0
        blocked_by = [item for item in prerequisite_ids(skill.id) if not by_skill.get(item) or by_skill[item].mastery < MASTERY_THRESHOLD]
        topic = db.session.get(Topic, skill.topic_id)
        nodes.append({
            "id": skill.id, "name": localized(skill.name), "topic_id": skill.topic_id,
            "topic_name": localized(topic.name), "mastery": round(mastery, 2),
            "confidence": round(state.confidence, 2) if state else 0,
            "status": "locked" if blocked_by else mastery_status(mastery, state.next_review_at if state else None),
            "blocked_by": blocked_by,
        })
    edges = db.session.scalars(
        db.select(PrerequisiteEdge).where(PrerequisiteEdge.skill_id.in_([skill.id for skill in skills]))
    ).all() if skills else []
    return {"subject_id": subject_id, "nodes": nodes, "edges": [{"from": item.prerequisite_skill_id, "to": item.skill_id} for item in edges]}


@governance_bp.get("/students/<studentId>/knowledge-map")
@roles_required("teacher", "admin")
def teacher_knowledge_map(studentId):
    if get_jwt().get("role") == "teacher":
        linked = db.session.scalar(
            db.select(ClassEnrollment).join(Classroom, ClassEnrollment.class_id == Classroom.id)
            .where(ClassEnrollment.student_id == studentId, Classroom.teacher_id == get_jwt_identity())
        )
        if not linked:
            return api_error("FORBIDDEN", "Ученик не состоит в вашем классе", 403)
    return success(_student_map(studentId, request.args.get("subject_id", "mathematics")))


@governance_bp.post("/materials/upload-url")
@roles_required("teacher", "admin")
def create_material_upload():
    data = request.get_json(silent=True) or {}
    filename = str(data.get("filename", "")).strip()
    if not filename:
        return api_error("VALIDATION_ERROR", "Укажите имя файла", 422)
    item = MaterialUpload(
        owner_id=get_jwt_identity(), filename=filename[:255],
        content_type=str(data.get("content_type", "application/octet-stream"))[:100],
        upload_token=secrets.token_urlsafe(32),
    )
    db.session.add(item)
    db.session.commit()
    base = request.host_url.rstrip("/")
    return success({
        "material_id": item.id,
        "upload_url": f"{base}/api/v1/materials/{item.id}/content?token={item.upload_token}",
        "method": "PUT", "content_type": item.content_type,
    }, status=201)


@governance_bp.put("/materials/<materialId>/content")
def upload_material_content(materialId):
    item = db.session.get(MaterialUpload, materialId)
    if not item or not secrets.compare_digest(request.args.get("token", ""), item.upload_token):
        return api_error("UPLOAD_NOT_FOUND", "Ссылка загрузки недействительна", 404)
    if len(request.data) > 10 * 1024 * 1024:
        return api_error("FILE_TOO_LARGE", "Максимальный размер файла — 10 МБ", 413)
    item.content = request.data
    item.status = "ready"
    db.session.commit()
    return success({"material_id": item.id, "status": item.status})


@governance_bp.get("/materials/<materialId>/content")
@jwt_required(locations=["headers"])
def download_material_content(materialId):
    item = db.session.get(MaterialUpload, materialId)
    if not item or item.status != "ready":
        return api_error("MATERIAL_NOT_FOUND", "Материал не найден", 404)
    if item.owner_id != get_jwt_identity() and get_jwt().get("role") != "admin":
        return api_error("FORBIDDEN", "Нет доступа к материалу", 403)
    return Response(item.content, content_type=item.content_type, headers={"Content-Disposition": f'inline; filename="{item.filename}"'})


@governance_bp.post("/ai/feedback/<feedbackId>/report")
@roles_required("student", "teacher", "admin")
def report_ai_feedback(feedbackId):
    reason = str((request.get_json(silent=True) or {}).get("reason", "Неточная информация")).strip()
    report = AIReport(reporter_id=get_jwt_identity(), feedback_id=feedbackId, reason=reason[:2000])
    db.session.add(report)
    db.session.commit()
    return success({"report": {"id": report.id, "status": report.status}}, status=201)


@governance_bp.get("/admin/content/review")
@admin_required
def content_review_queue():
    items = db.session.scalars(
        db.select(LearningModule).where(LearningModule.status.in_(["draft", "rejected"])).order_by(LearningModule.id)
    ).all()
    return success({"items": [{"id": item.id, "title": localized(item.title), "status": item.status, "version": item.version} for item in items]})


def _moderate_content(content_id, approved):
    module = db.session.get(LearningModule, content_id)
    if not module:
        return api_error("CONTENT_NOT_FOUND", "Материал не найден", 404)
    module.status = "published" if approved else "rejected"
    module.version += 1
    details = request.get_json(silent=True) or {}
    _audit("content.approved" if approved else "content.rejected", "module", module.id, details)
    db.session.commit()
    return success({"content": {"id": module.id, "status": module.status}})


@governance_bp.post("/admin/content/<contentId>/approve")
@admin_required
def approve_content(contentId):
    return _moderate_content(contentId, True)


@governance_bp.post("/admin/content/<contentId>/reject")
@admin_required
def reject_content(contentId):
    return _moderate_content(contentId, False)


@governance_bp.get("/admin/ai/reports")
@admin_required
def ai_reports():
    items = db.session.scalars(db.select(AIReport).order_by(AIReport.created_at.desc())).all()
    return success({"items": [{
        "id": item.id, "feedback_id": item.feedback_id, "reason": item.reason,
        "status": item.status, "resolution": item.resolution, "created_at": item.created_at.isoformat(),
    } for item in items]})


@governance_bp.patch("/admin/ai/reports/<reportId>")
@admin_required
def update_ai_report(reportId):
    report = db.session.get(AIReport, reportId)
    if not report:
        return api_error("REPORT_NOT_FOUND", "Жалоба не найдена", 404)
    data = request.get_json(silent=True) or {}
    status = str(data.get("status", "resolved"))
    if status not in {"open", "reviewing", "resolved", "dismissed"}:
        return api_error("VALIDATION_ERROR", "Некорректный статус", 422)
    report.status = status
    report.resolution = str(data.get("resolution", "")).strip()[:2000] or None
    _audit("ai_report.updated", "ai_report", report.id, {"status": status})
    db.session.commit()
    return success({"report": {"id": report.id, "status": report.status, "resolution": report.resolution}})


@governance_bp.get("/admin/audit-log")
@admin_required
def audit_log():
    items = db.session.scalars(db.select(AuditLog).order_by(AuditLog.created_at.desc()).limit(200)).all()
    return success({"items": [{
        "id": item.id, "actor_id": item.actor_id, "action": item.action,
        "entity_type": item.entity_type, "entity_id": item.entity_id,
        "details": item.details, "created_at": item.created_at.isoformat(),
    } for item in items]})


@governance_bp.post("/events/batch")
@roles_required("student", "teacher", "admin")
def events_batch():
    data = request.get_json(silent=True) or {}
    events = data.get("events", [])
    if not isinstance(events, list) or len(events) > 100:
        return api_error("VALIDATION_ERROR", "Ожидается массив до 100 событий", 422)
    saved = 0
    for item in events:
        name = str(item.get("name", "")) if isinstance(item, dict) else ""
        if name not in ALLOWED_EVENTS:
            continue
        occurred_at = datetime.now(timezone.utc)
        if item.get("occurred_at"):
            try:
                occurred_at = datetime.fromisoformat(str(item["occurred_at"]).replace("Z", "+00:00"))
            except ValueError:
                return api_error("VALIDATION_ERROR", "Некорректная дата события", 422)
        try:
            record_learning_event(
                get_jwt_identity(),
                name,
                item.get("properties", {}),
                occurred_at=occurred_at,
            )
        except EventValidationError as error:
            return api_error("VALIDATION_ERROR", str(error), 422)
        saved += 1
    db.session.commit()
    return success({"accepted": saved})
