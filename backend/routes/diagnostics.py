from datetime import datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from models import (
    Diagnostic,
    DiagnosticAnswer,
    DiagnosticQuestion,
    DiagnosticResult,
    Subject,
    db,
)
from services.learning import answer_is_correct, build_or_recalculate_path, complete_diagnostic_profile
from utils.decorators import roles_required
from utils.localization import localized
from utils.responses import api_error, success


diagnostics_bp = Blueprint("diagnostics", __name__)


def _diagnostic_or_error(diagnostic_id, allow_teacher=False):
    diagnostic = db.session.get(Diagnostic, diagnostic_id)
    if not diagnostic:
        return None, api_error("DIAGNOSTIC_NOT_FOUND", "Диагностика не найдена", 404)
    role = get_jwt().get("role")
    if diagnostic.student_id != get_jwt_identity() and not (allow_teacher and role in {"teacher", "admin"}):
        return None, api_error("FORBIDDEN", "Нет доступа к диагностике", 403)
    return diagnostic, None


def _question_payload(question):
    return {
        "id": question.id,
        "skill_id": question.skill_id,
        "prompt": localized(question.prompt),
        "options": question.options or [],
        "difficulty": question.difficulty,
    }


def _diagnostic_payload(diagnostic):
    total = db.session.scalar(
        db.select(db.func.count()).select_from(DiagnosticQuestion).where(
            DiagnosticQuestion.subject_id == diagnostic.subject_id
        )
    )
    answered = db.session.scalar(
        db.select(db.func.count()).select_from(DiagnosticAnswer).where(
            DiagnosticAnswer.diagnostic_id == diagnostic.id
        )
    )
    return {
        "id": diagnostic.id,
        "student_id": diagnostic.student_id,
        "subject_id": diagnostic.subject_id,
        "goal_id": diagnostic.goal_id,
        "grade": diagnostic.grade,
        "status": diagnostic.status,
        "answered_questions": answered,
        "total_questions": total,
        "progress": round(answered / total, 2) if total else 0,
        "created_at": diagnostic.created_at.isoformat(),
        "completed_at": diagnostic.completed_at.isoformat() if diagnostic.completed_at else None,
    }


def _next_question(diagnostic):
    answered_ids = db.select(DiagnosticAnswer.question_id).where(
        DiagnosticAnswer.diagnostic_id == diagnostic.id
    )
    unanswered = db.session.scalars(
        db.select(DiagnosticQuestion)
        .where(
            DiagnosticQuestion.subject_id == diagnostic.subject_id,
            DiagnosticQuestion.id.not_in(answered_ids),
        )
        .order_by(DiagnosticQuestion.order_index)
    ).all()
    if not unanswered:
        return None

    latest_answer = db.session.scalar(
        db.select(DiagnosticAnswer)
        .where(DiagnosticAnswer.diagnostic_id == diagnostic.id)
        .order_by(DiagnosticAnswer.answered_at.desc())
    )
    if latest_answer:
        previous_question = db.session.get(DiagnosticQuestion, latest_answer.question_id)
        if latest_answer.is_correct:
            harder = [question for question in unanswered if question.difficulty > previous_question.difficulty]
            if harder:
                return harder[0]
        else:
            reinforcement = [question for question in unanswered if question.difficulty <= previous_question.difficulty]
            if reinforcement:
                return reinforcement[0]
    return unanswered[0]


@diagnostics_bp.post("/diagnostics")
@roles_required("student")
def create_diagnostic():
    data = request.get_json(silent=True) or {}
    subject_id = str(data.get("subject_id", ""))
    goal_id = str(data.get("goal_id", "exam"))
    try:
        grade = int(data.get("grade", 9))
    except (TypeError, ValueError):
        return api_error("VALIDATION_ERROR", "Некорректный класс", 422)
    if not db.session.get(Subject, subject_id):
        return api_error("SUBJECT_NOT_FOUND", "Предмет не найден", 404)
    if grade not in range(7, 13):
        return api_error("VALIDATION_ERROR", "Допустимы классы 7–12", 422)

    active = db.session.scalar(
        db.select(Diagnostic).filter_by(
            student_id=get_jwt_identity(), subject_id=subject_id, status="in_progress"
        )
    )
    if active:
        return success({"diagnostic": _diagnostic_payload(active)}, status=200)

    diagnostic = Diagnostic(
        student_id=get_jwt_identity(),
        subject_id=subject_id,
        goal_id=goal_id,
        grade=grade,
    )
    db.session.add(diagnostic)
    db.session.commit()
    return success({"diagnostic": _diagnostic_payload(diagnostic)}, status=201)


@diagnostics_bp.get("/diagnostics/<diagnosticId>")
@jwt_required(locations=["headers"])
def get_diagnostic(diagnosticId):
    diagnostic, error = _diagnostic_or_error(diagnosticId, allow_teacher=True)
    return error or success({"diagnostic": _diagnostic_payload(diagnostic)})


@diagnostics_bp.get("/diagnostics/<diagnosticId>/next-question")
@jwt_required(locations=["headers"])
def next_question(diagnosticId):
    diagnostic, error = _diagnostic_or_error(diagnosticId)
    if error:
        return error
    if diagnostic.status != "in_progress":
        return api_error("DIAGNOSTIC_COMPLETED", "Диагностика уже завершена", 409)
    question = _next_question(diagnostic)
    return success({
        "question": _question_payload(question) if question else None,
        "complete_ready": question is None,
        "diagnostic": _diagnostic_payload(diagnostic),
        "selection_algorithm": "adaptive-difficulty-v1",
    })


@diagnostics_bp.post("/diagnostics/<diagnosticId>/answers")
@jwt_required(locations=["headers"])
def submit_diagnostic_answer(diagnosticId):
    diagnostic, error = _diagnostic_or_error(diagnosticId)
    if error:
        return error
    if diagnostic.status != "in_progress":
        return api_error("DIAGNOSTIC_COMPLETED", "Диагностика уже завершена", 409)
    data = request.get_json(silent=True) or {}
    question = db.session.get(DiagnosticQuestion, str(data.get("question_id", "")))
    if not question or question.subject_id != diagnostic.subject_id:
        return api_error("QUESTION_NOT_FOUND", "Вопрос не найден", 404)
    if db.session.scalar(db.select(DiagnosticAnswer).filter_by(
        diagnostic_id=diagnostic.id, question_id=question.id
    )):
        return api_error("ANSWER_ALREADY_SUBMITTED", "Ответ на этот вопрос уже сохранён", 409)
    answer = str(data.get("answer", "")).strip()
    if not answer or len(answer) > 500:
        return api_error("VALIDATION_ERROR", "Ответ должен содержать от 1 до 500 символов", 422)

    is_correct = answer_is_correct(answer, question.acceptable_answers)
    try:
        time_spent_seconds = max(int(data.get("time_spent_seconds", 0) or 0), 0)
        attempt_number = max(int(data.get("attempt_number", 1) or 1), 1)
    except (TypeError, ValueError):
        return api_error("VALIDATION_ERROR", "Время и номер попытки должны быть числами", 422)
    record = DiagnosticAnswer(
        diagnostic_id=diagnostic.id,
        question_id=question.id,
        answer=answer,
        is_correct=is_correct,
        time_spent_seconds=time_spent_seconds,
        attempt_number=attempt_number,
    )
    db.session.add(record)
    db.session.commit()
    following = _next_question(diagnostic)
    return success({
        "is_correct": is_correct,
        "feedback": "Ответ сохранён. Продолжим диагностику.",
        "next_question_available": following is not None,
        "complete_ready": following is None,
        "diagnostic": _diagnostic_payload(diagnostic),
    }, status=201)


@diagnostics_bp.post("/diagnostics/<diagnosticId>/complete")
@jwt_required(locations=["headers"])
def complete_diagnostic(diagnosticId):
    diagnostic, error = _diagnostic_or_error(diagnosticId)
    if error:
        return error
    existing = db.session.get(DiagnosticResult, diagnostic.id)
    if existing:
        return success({"result": _result_payload(existing), "learning_path_id": _path_id(diagnostic.id)})
    if _next_question(diagnostic) is not None:
        return api_error("DIAGNOSTIC_INCOMPLETE", "Ответьте на все вопросы диагностики", 409)

    profile = complete_diagnostic_profile(diagnostic)
    diagnostic.status = "completed"
    diagnostic.completed_at = datetime.now(timezone.utc)
    result = DiagnosticResult(
        diagnostic_id=diagnostic.id,
        level=profile["level"],
        score=profile["score"],
        strengths=profile["strengths"],
        gaps=profile["gaps"],
        explanation={
            "ru": "Маршрут начинается с наиболее раннего пробела в цепочке навыков.",
            "kk": "Бағыт дағдылар тізбегіндегі ең ерте олқылықтан басталады.",
        },
    )
    db.session.add(result)
    path = build_or_recalculate_path(
        diagnostic.student_id,
        diagnostic.subject_id,
        diagnostic.goal_id,
        diagnostic_id=diagnostic.id,
    )
    db.session.commit()
    return success({"result": _result_payload(result), "learning_path_id": path.id}, status=201)


def _path_id(diagnostic_id):
    from models import LearningPath
    path = db.session.scalar(db.select(LearningPath).filter_by(diagnostic_id=diagnostic_id))
    return path.id if path else None


def _result_payload(result):
    return {
        "diagnostic_id": result.diagnostic_id,
        "level": result.level,
        "score": result.score,
        "strengths": result.strengths,
        "gaps": result.gaps,
        "explanation": localized(result.explanation),
        "algorithm_version": "diagnostic-mastery-v1",
    }


@diagnostics_bp.get("/diagnostics/<diagnosticId>/result")
@jwt_required(locations=["headers"])
def diagnostic_result(diagnosticId):
    diagnostic, error = _diagnostic_or_error(diagnosticId, allow_teacher=True)
    if error:
        return error
    result = db.session.get(DiagnosticResult, diagnostic.id)
    if not result:
        return api_error("RESULT_NOT_READY", "Результат ещё не сформирован", 409)
    return success({"result": _result_payload(result), "learning_path_id": _path_id(diagnostic.id)})


@diagnostics_bp.get("/students/me/diagnostics")
@roles_required("student")
def diagnostic_history():
    items = db.session.scalars(
        db.select(Diagnostic)
        .where(Diagnostic.student_id == get_jwt_identity())
        .order_by(Diagnostic.created_at.desc())
    ).all()
    return success({"items": [_diagnostic_payload(item) for item in items]})
