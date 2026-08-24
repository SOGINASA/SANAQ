import json
from datetime import datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from models import Attempt, KnowledgeState, LearningPath, LearningStep, Task, TaskAnswer, db
from services.events import record_learning_event
from services.learning import answer_is_correct, apply_attempt_result, mastery_status, normalize_answer
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


def _task_answer_is_correct(task, answer):
    if task.task_type == "multiple_choice":
        try:
            selected = json.loads(answer)
        except (TypeError, ValueError, json.JSONDecodeError):
            return False
        if not isinstance(selected, list):
            return False
        return {str(item).strip().casefold() for item in selected} == {
            str(item).strip().casefold() for item in (task.acceptable_answers or [])
        }
    if task.task_type == "matching":
        try:
            selected = json.loads(answer)
        except (TypeError, ValueError, json.JSONDecodeError):
            return False
        if not isinstance(selected, dict):
            return False
        expected = {}
        for pair in task.acceptable_answers or []:
            if "|||" not in str(pair):
                return False
            left, right = str(pair).split("|||", 1)
            expected[normalize_answer(left)] = normalize_answer(right)
        actual = {normalize_answer(left): normalize_answer(right) for left, right in selected.items()}
        return actual == expected
    if task.task_type == "ordering":
        try:
            selected = json.loads(answer)
        except (TypeError, ValueError, json.JSONDecodeError):
            return False
        return isinstance(selected, list) and [normalize_answer(item) for item in selected] == [
            normalize_answer(item) for item in (task.acceptable_answers or [])
        ]
    if task.task_type == "numeric":
        try:
            expected = float(task.acceptable_answers[0])
            tolerance = abs(float(task.acceptable_answers[1])) if len(task.acceptable_answers) > 1 else 0.0
            return abs(float(answer.replace(",", ".")) - expected) <= tolerance
        except (TypeError, ValueError, IndexError):
            return False
    return answer_is_correct(answer, task.acceptable_answers)


def _adaptation_payload(task, answer, state=None):
    is_correct = bool(answer and answer.is_correct)
    current = max(1, min(5, int(task.difficulty)))
    recommended = min(5, current + 1) if is_correct else max(1, current - 1)
    direction = "up" if recommended > current else "down" if recommended < current else "same"
    if is_correct and direction == "up":
        reason = {
            "ru": "Ответ верный — следующее задание будет сложнее, чтобы сохранить полезный вызов.",
            "kk": "Жауап дұрыс — пайдалы қиындықты сақтау үшін келесі тапсырма күрделірек болады.",
            "en": "Your answer was correct, so the next task can be harder while staying productively challenging.",
        }
    elif not is_correct and direction == "down":
        reason = {
            "ru": "Ответ пока неверный — следующий шаг будет проще и поможет закрепить основу.",
            "kk": "Жауап әзірге дұрыс емес — келесі қадам жеңілірек болып, негізді бекітуге көмектеседі.",
            "en": "This answer was not correct yet, so the next step will be easier and reinforce the foundation.",
        }
    else:
        reason = {
            "ru": "Уровень остаётся прежним: вы на границе доступного диапазона сложности.",
            "kk": "Деңгей өзгермейді: сіз қолжетімді қиындық ауқымының шегіндесіз.",
            "en": "The level stays the same because you are at the edge of the available difficulty range.",
        }
    return {
        "algorithm": "answer-difficulty-v1",
        "current_difficulty": current,
        "recommended_difficulty": recommended,
        "direction": direction,
        "reason": localized(reason),
        "based_on": {
            "is_correct": is_correct,
            "mastery": round(state.mastery, 2) if state else None,
        },
    }


def _apply_adaptive_task(student_id, recommended_difficulty):
    step = db.session.scalar(
        db.select(LearningStep)
        .join(LearningPath, LearningStep.path_id == LearningPath.id)
        .where(
            LearningPath.student_id == student_id,
            LearningPath.status == "active",
            LearningStep.status == "available",
        )
        .order_by(LearningStep.order_index)
    )
    if not step:
        return {"applied": False, "task_id": None}
    candidates = db.session.scalars(
        db.select(Task).where(Task.skill_id == step.skill_id, Task.is_published.is_(True))
    ).all()
    if not candidates:
        return {"applied": False, "task_id": None}
    selected = min(candidates, key=lambda item: (abs(item.difficulty - recommended_difficulty), item.difficulty))
    step.task_id = selected.id
    return {"applied": True, "task_id": selected.id, "difficulty": selected.difficulty}


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
    db.session.flush()
    record_learning_event(get_jwt_identity(), "attempt_started", {
        "attempt_id": attempt.id,
        "task_id": task.id,
        "skill_id": task.skill_id,
        "difficulty": task.difficulty,
    })
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
    is_correct = _task_answer_is_correct(task, answer)
    record = TaskAnswer(
        attempt_id=attempt.id,
        answer=answer,
        is_correct=is_correct,
        attempt_number=count + 1,
    )
    db.session.add(record)
    record_learning_event(attempt.student_id, "answer_submitted", {
        "attempt_id": attempt.id,
        "task_id": task.id,
        "skill_id": task.skill_id,
        "is_correct": is_correct,
        "attempt_number": record.attempt_number,
    })
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
        "next_difficulty": min(5, task.difficulty + 1) if is_correct else max(1, task.difficulty - 1),
        "adaptation": _adaptation_payload(task, record),
        "knowledge_map_changes": [{"skill_id": task.skill_id, "pending": True}],
    }, status=201)


def _result_payload(attempt):
    task = db.session.get(Task, attempt.task_id)
    answer = _latest_answer(attempt.id)
    state = db.session.scalar(db.select(KnowledgeState).filter_by(
        student_id=attempt.student_id, skill_id=task.skill_id
    ))
    answer_count = db.session.scalar(
        db.select(db.func.count()).select_from(TaskAnswer).where(TaskAnswer.attempt_id == attempt.id)
    ) or 0
    mastery = round(state.mastery, 2) if state else 0
    correct = bool(answer and answer.is_correct)
    if correct and answer_count == 1:
        feedback_kind = "mastered_first_try"
        headline = "Получилось с первой попытки"
        detail = "Ответ уверенный. Можно переходить к следующему шагу маршрута."
    elif correct:
        feedback_kind = "mastered_after_support"
        headline = "Ошибка исправлена"
        detail = "Повторная попытка верная — основа закрепляется, но навык стоит повторить по расписанию."
    else:
        feedback_kind = "needs_reinforcement"
        headline = "Навык пока требует закрепления"
        detail = "Разберите объяснение и выполните более простое задание перед следующим шагом."
    return {
        "attempt": _attempt_payload(attempt),
        "is_correct": answer.is_correct if answer else False,
        "answer": answer.answer if answer else None,
        "correct_answer": task.acceptable_answers[0] if task.acceptable_answers else None,
        "explanation": localized(task.explanation),
        "generated_by_ai": False,
        "skill": {
            "id": task.skill_id,
            "mastery": mastery,
            "status": mastery_status(state.mastery, state.next_review_at) if state else "available",
            "next_review_at": state.next_review_at.isoformat() if state and state.next_review_at else None,
        },
        "adaptation": _adaptation_payload(task, answer, state),
        "feedback_summary": {
            "kind": feedback_kind,
            "headline": headline,
            "detail": detail,
            "attempt_count": answer_count,
            "mastery_percent": round(mastery * 100),
            "next_action": "continue_path" if correct else "retry_easier",
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
    adaptation = _adaptation_payload(task, answer, state)
    application = _apply_adaptive_task(attempt.student_id, adaptation["recommended_difficulty"])
    attempt.status = "completed"
    attempt.score = 1.0 if answer.is_correct and answer.attempt_number == 1 else 0.7 if answer.is_correct else 0.0
    attempt.completed_at = datetime.now(timezone.utc)
    record_learning_event(attempt.student_id, "attempt_completed", {
        "attempt_id": attempt.id,
        "task_id": task.id,
        "skill_id": task.skill_id,
        "score": attempt.score,
        "is_correct": answer.is_correct,
        "mastery_before": round(previous, 3),
        "mastery_after": round(state.mastery, 3),
        "difficulty": task.difficulty,
    })
    db.session.commit()
    result = _result_payload(attempt)
    result["adaptation"].update({"application": application})
    result["mastery_change"] = round(state.mastery - previous, 2)
    result["mastery_before"] = round(previous, 2)
    result["mastery_after"] = round(state.mastery, 2)
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
