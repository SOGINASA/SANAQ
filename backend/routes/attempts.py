from datetime import datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from models import Attempt, KnowledgeState, Task, TaskAnswer, db
from services.learning import answer_is_correct, apply_attempt_result, mastery_status
from utils.decorators import roles_required
from utils.localization import localized
from utils.responses import api_error, success


attempts_bp = Blueprint("attempts", __name__)


def _attempt_or_error(attempt_id, allow_teacher=False):
    attempt = db.session.get(Attempt, attempt_id)
    if not attempt:
        return None, api_error("ATTEMPT_NOT_FOUND", "Попытка не найдена", 404)
    role = get_jwt().get("role")
    if attempt.student_id != get_jwt_identity() and not (allow_teacher and role in {"teacher", "admin"}):
        return None, api_error("FORBIDDEN", "Нет доступа к попытке", 403)
    return attempt, None


def _attempt_payload(attempt):
    return {
        "id": attempt.id,
        "task_id": attempt.task_id,
        "status": attempt.status,
        "difficulty": attempt.difficulty,
        "score": attempt.score,
        "started_at": attempt.started_at.isoformat(),
        "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
    }


def _latest_answer(attempt_id):
    return db.session.scalar(
        db.select(TaskAnswer)
        .where(TaskAnswer.attempt_id == attempt_id)
        .order_by(TaskAnswer.attempt_number.desc())
    )


@attempts_bp.post("/tasks/<taskId>/attempts")
@roles_required("student")
def start_attempt(taskId):
    task = db.session.get(Task, taskId)
    if not task or not task.is_published:
        return api_error("TASK_NOT_FOUND", "Задание не найдено", 404)
    existing = db.session.scalar(
        db.select(Attempt).filter_by(
            student_id=get_jwt_identity(), task_id=task.id, status="in_progress"
        )
    )
    if existing:
        return success({"attempt": _attempt_payload(existing)})
    attempt = Attempt(
        student_id=get_jwt_identity(),
        task_id=task.id,
        difficulty=task.difficulty,
    )
    db.session.add(attempt)
    db.session.commit()
    return success({"attempt": _attempt_payload(attempt)}, status=201)


@attempts_bp.post("/attempts/<attemptId>/answers")
@jwt_required(locations=["headers"])
def submit_attempt_answer(attemptId):
    attempt, error = _attempt_or_error(attemptId)
    if error:
        return error
    if attempt.status != "in_progress":
        return api_error("ATTEMPT_COMPLETED", "Попытка уже завершена", 409)
    task = db.session.get(Task, attempt.task_id)
    data = request.get_json(silent=True) or {}
    answer = str(data.get("answer", "")).strip()
    if not answer or len(answer) > 500:
        return api_error("VALIDATION_ERROR", "Ответ должен содержать от 1 до 500 символов", 422)
    count = db.session.scalar(
        db.select(db.func.count()).select_from(TaskAnswer).where(TaskAnswer.attempt_id == attempt.id)
    )
    is_correct = answer_is_correct(answer, task.acceptable_answers)
    record = TaskAnswer(
        attempt_id=attempt.id,
        answer=answer,
        is_correct=is_correct,
        attempt_number=count + 1,
    )
    db.session.add(record)
    db.session.commit()
    return success({
        "answer_id": record.id,
        "is_correct": is_correct,
        "feedback": (
            "Верно. Завершите попытку, чтобы обновить карту знаний."
            if is_correct else
            "Пока неверно. Используйте подсказку или смените формат объяснения."
        ),
        "hint": None if is_correct else localized(task.hint),
        "mastery_change": 0.45 if is_correct else -0.05,
        "next_difficulty": min(3, task.difficulty + 1) if is_correct else max(1, task.difficulty - 1),
        "knowledge_map_changes": [{"skill_id": task.skill_id, "pending": True}],
    }, status=201)


def _result_payload(attempt):
    task = db.session.get(Task, attempt.task_id)
    answer = _latest_answer(attempt.id)
    state = db.session.scalar(db.select(KnowledgeState).filter_by(
        student_id=attempt.student_id, skill_id=task.skill_id
    ))
    return {
        "attempt": _attempt_payload(attempt),
        "is_correct": answer.is_correct if answer else False,
        "answer": answer.answer if answer else None,
        "correct_answer": task.acceptable_answers[0] if task.acceptable_answers else None,
        "explanation": localized(task.explanation),
        "generated_by_ai": False,
        "skill": {
            "id": task.skill_id,
            "mastery": round(state.mastery, 2) if state else 0,
            "status": mastery_status(state.mastery, state.next_review_at) if state else "available",
            "next_review_at": state.next_review_at.isoformat() if state and state.next_review_at else None,
        },
    }


@attempts_bp.post("/attempts/<attemptId>/complete")
@jwt_required(locations=["headers"])
def complete_attempt(attemptId):
    attempt, error = _attempt_or_error(attemptId)
    if error:
        return error
    if attempt.status == "completed":
        return success({"result": _result_payload(attempt)})
    answer = _latest_answer(attempt.id)
    if not answer:
        return api_error("ANSWER_REQUIRED", "Сначала отправьте ответ", 409)
    task = db.session.get(Task, attempt.task_id)
    previous, state = apply_attempt_result(attempt, task, answer.is_correct)
    attempt.status = "completed"
    attempt.score = 1.0 if answer.is_correct and answer.attempt_number == 1 else 0.7 if answer.is_correct else 0.0
    attempt.completed_at = datetime.now(timezone.utc)
    db.session.commit()
    result = _result_payload(attempt)
    result["mastery_change"] = round(state.mastery - previous, 2)
    result["knowledge_map_changes"] = [{
        "skill_id": task.skill_id,
        "mastery": round(state.mastery, 2),
        "status": mastery_status(state.mastery, state.next_review_at),
    }]
    return success({"result": result})


@attempts_bp.get("/attempts/<attemptId>/result")
@jwt_required(locations=["headers"])
def attempt_result(attemptId):
    attempt, error = _attempt_or_error(attemptId, allow_teacher=True)
    if error:
        return error
    if attempt.status != "completed":
        return api_error("RESULT_NOT_READY", "Попытка ещё не завершена", 409)
    return success({"result": _result_payload(attempt)})


@attempts_bp.get("/students/me/attempts")
@roles_required("student")
def attempt_history():
    attempts = db.session.scalars(
        db.select(Attempt)
        .where(Attempt.student_id == get_jwt_identity())
        .order_by(Attempt.started_at.desc())
    ).all()
    return success({"items": [_attempt_payload(attempt) for attempt in attempts]})

