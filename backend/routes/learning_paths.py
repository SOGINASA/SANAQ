from datetime import date, timedelta

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from models import (
    KnowledgeState,
    LearningPath,
    LearningStep,
    PrerequisiteEdge,
    StudentProfile,
    Subject,
    Topic,
    db,
)
from services.curriculum_graph import build_student_curriculum_state
from services.events import record_learning_event
from services.learning import (
    MASTERY_THRESHOLD,
    available_learning_skills,
    build_or_recalculate_path,
    mastery_status,
    prerequisite_ids,
    serialize_path,
    serialize_step,
)
from services.planner import PlannerConfig, PlannerValidationError, generate_deterministic_plan
from utils.decorators import roles_required
from utils.localization import localized
from utils.responses import api_error, success


learning_paths_bp = Blueprint("learning_paths", __name__)


@learning_paths_bp.post("/students/me/study-plan/preview")
@roles_required("student")
def preview_study_plan():
    data = request.get_json(silent=True) or {}
    student_id = get_jwt_identity()
    subject_id = str(data.get("subject_id", "mathematics"))
    if not db.session.get(Subject, subject_id):
        return api_error("SUBJECT_NOT_FOUND", "Предмет не найден", 404)
    profile = db.session.get(StudentProfile, student_id)
    grade = data.get("grade", profile.grade if profile else None)
    if not isinstance(grade, int) or grade not in range(7, 13):
        return api_error("GRADE_REQUIRED", "Укажите класс от 7 до 12", 422)
    try:
        start_date = date.fromisoformat(data.get("start_date", date.today().isoformat()))
        target_date = date.fromisoformat(
            data.get("target_date", (start_date + timedelta(days=30)).isoformat())
        )
        config = PlannerConfig(
            start_date=start_date,
            target_date=target_date,
            weekday_minutes=int(data.get("weekday_minutes", 30)),
            weekend_minutes=int(data.get("weekend_minutes", 45)),
            max_skills=int(data.get("max_skills", 20)),
        )
        state = build_student_curriculum_state(student_id, subject_id, grade)
        plan = generate_deterministic_plan(state, config)
    except (TypeError, ValueError, PlannerValidationError) as error:
        return api_error("VALIDATION_ERROR", str(error), 422)
    record_learning_event(student_id, "study_plan_generated", {
        "planner_version": plan["planner_version"],
        "grade": grade,
        "planned_minutes": plan["summary"]["planned_minutes"],
        "selected_skills": plan["summary"]["selected_skills"],
        "scheduled_days": plan["summary"]["scheduled_days"],
    })
    db.session.commit()
    return success({"study_plan": plan})


def _path_or_error(path_id, allow_teacher=False):
    path = db.session.get(LearningPath, path_id)
    if not path:
        return None, api_error("LEARNING_PATH_NOT_FOUND", "Маршрут не найден", 404)
    role = get_jwt().get("role")
    if path.student_id != get_jwt_identity() and not (allow_teacher and role in {"teacher", "admin"}):
        return None, api_error("FORBIDDEN", "Нет доступа к маршруту", 403)
    return path, None


@learning_paths_bp.get("/students/me/learning-paths")
@roles_required("student")
def learning_paths():
    paths = db.session.scalars(
        db.select(LearningPath)
        .where(LearningPath.student_id == get_jwt_identity())
        .order_by(LearningPath.created_at.desc())
    ).all()
    return success({"items": [serialize_path(path, include_steps=False) for path in paths]})


@learning_paths_bp.post("/students/me/learning-paths")
@roles_required("student")
def create_learning_path():
    data = request.get_json(silent=True) or {}
    subject_id = str(data.get("subject_id", "mathematics"))
    goal_id = str(data.get("goal_id", "exam"))
    if not db.session.get(Subject, subject_id):
        return api_error("SUBJECT_NOT_FOUND", "Предмет не найден", 404)
    path = build_or_recalculate_path(get_jwt_identity(), subject_id, goal_id)
    db.session.commit()
    return success({"learning_path": serialize_path(path)}, status=201)


@learning_paths_bp.get("/learning-paths/<pathId>")
@jwt_required(locations=["headers"])
def get_learning_path(pathId):
    path, error = _path_or_error(pathId, allow_teacher=True)
    if error:
        return error
    return success({"learning_path": serialize_path(path)})


@learning_paths_bp.post("/learning-paths/<pathId>/recalculate")
@jwt_required(locations=["headers"])
def recalculate_learning_path(pathId):
    path, error = _path_or_error(pathId)
    if error:
        return error
    build_or_recalculate_path(
        path.student_id,
        path.subject_id,
        path.goal_id,
        diagnostic_id=path.diagnostic_id,
        path=path,
    )
    db.session.commit()
    return success({"learning_path": serialize_path(path)})


@learning_paths_bp.get("/learning-paths/<pathId>/next-step")
@jwt_required(locations=["headers"])
def next_learning_step(pathId):
    path, error = _path_or_error(pathId)
    if error:
        return error
    step = db.session.scalar(
        db.select(LearningStep)
        .where(LearningStep.path_id == path.id, LearningStep.status == "available")
        .order_by(LearningStep.order_index)
    )
    return success({
        "step": serialize_step(step) if step else None,
        "path_completed": step is None,
    })


@learning_paths_bp.patch("/learning-paths/<pathId>")
@jwt_required(locations=["headers"])
def update_learning_path(pathId):
    path, error = _path_or_error(pathId)
    if error:
        return error
    data = request.get_json(silent=True) or {}
    if "goal_id" in data:
        path.goal_id = str(data["goal_id"])
    if "pace" in data:
        pace = str(data["pace"])
        if pace not in {"light", "balanced", "intensive"}:
            return api_error("VALIDATION_ERROR", "Темп: light, balanced или intensive", 422)
        path.pace = pace
    if "target_date" in data:
        try:
            path.target_date = date.fromisoformat(data["target_date"]) if data["target_date"] else None
        except (TypeError, ValueError):
            return api_error("VALIDATION_ERROR", "Дата должна быть в формате YYYY-MM-DD", 422)
    db.session.commit()
    return success({"learning_path": serialize_path(path)})


@learning_paths_bp.get("/students/me/knowledge-map")
@roles_required("student")
def knowledge_map():
    subject_id = request.args.get("subject_id", "mathematics")
    skills = available_learning_skills(subject_id)
    if not skills:
        return api_error("SUBJECT_NOT_FOUND", "Предмет не найден", 404)
    states = db.session.scalars(
        db.select(KnowledgeState).where(
            KnowledgeState.student_id == get_jwt_identity(),
            KnowledgeState.skill_id.in_([skill.id for skill in skills]),
        )
    ).all()
    state_by_skill = {state.skill_id: state for state in states}
    nodes = []
    for skill in skills:
        state = state_by_skill.get(skill.id)
        mastery = state.mastery if state else 0.0
        prereqs = prerequisite_ids(skill.id)
        blocked_by = [
            prereq for prereq in prereqs
            if not state_by_skill.get(prereq) or state_by_skill[prereq].mastery < MASTERY_THRESHOLD
        ]
        status = "locked" if blocked_by else mastery_status(
            mastery, state.next_review_at if state else None
        )
        topic = db.session.get(Topic, skill.topic_id)
        nodes.append({
            "id": skill.id,
            "name": localized(skill.name),
            "topic_id": skill.topic_id,
            "topic_name": localized(topic.name),
            "mastery": round(mastery, 2),
            "mastery_label": "освоено" if mastery >= 0.8 else "в процессе" if mastery >= 0.45 else "есть пробел",
            "confidence": round(state.confidence, 2) if state else 0,
            "status": status,
            "blocked_by": blocked_by,
            "next_review_at": state.next_review_at.isoformat() if state and state.next_review_at else None,
        })
    edges = db.session.scalars(
        db.select(PrerequisiteEdge).where(
            PrerequisiteEdge.skill_id.in_([skill.id for skill in skills])
        )
    ).all()
    return success({
        "subject_id": subject_id,
        "nodes": nodes,
        "edges": [
            {"from": edge.prerequisite_skill_id, "to": edge.skill_id}
            for edge in edges
        ],
    })
