from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity

from models import Attempt, Task, TaskAnswer, db
from utils.decorators import roles_required
from utils.localization import localized
from utils.responses import api_error, success


ai_bp = Blueprint("ai", __name__)


def _task_from_payload(data):
    task = db.session.get(Task, str(data.get("task_id", "")))
    if not task or not task.is_published:
        return None, api_error("TASK_NOT_FOUND", "Задание не найдено", 404)
    return task, None


def _explanation_content(task, mode):
    explanation = localized(task.explanation)
    if mode == "short":
        return explanation.split(".")[0].strip() + "."
    if mode == "steps":
        return {
            "title": "Разберём по шагам",
            "steps": [localized(task.hint), explanation],
        }
    return {
        "title": "Связь с жизненной ситуацией",
        "example": "Представьте, что большое выражение нужно разложить на простые детали, как набор конструктора.",
        "explanation": explanation,
    }


@ai_bp.post("/ai/explanations")
@roles_required("student")
def explanation():
    data = request.get_json(silent=True) or {}
    task, error = _task_from_payload(data)
    if error:
        return error
    mode = str(data.get("mode", "short"))
    if mode not in {"short", "steps", "real_life"}:
        return api_error("VALIDATION_ERROR", "Режим: short, steps или real_life", 422)
    attempt_id = str(data.get("attempt_id", ""))
    attempt = db.session.get(Attempt, attempt_id)
    if not attempt or attempt.student_id != get_jwt_identity() or attempt.task_id != task.id:
        return api_error("ATTEMPT_REQUIRED", "Сначала начните попытку задания", 409)
    if not db.session.scalar(db.select(TaskAnswer).where(TaskAnswer.attempt_id == attempt.id)):
        return api_error("ANSWER_REQUIRED", "Сначала попробуйте решить задание", 409)
    return success({
        "mode": mode,
        "content": _explanation_content(task, mode),
        "reason": "Объяснение выбрано для навыка, проверяемого текущим заданием.",
        "source_skill_ids": [task.skill_id],
        "confidence": 1.0,
        "generated_by_ai": False,
        "model_version": "deterministic-fallback-v1",
        "warning": "Использовано проверенное резервное объяснение без внешней AI-модели.",
    })


@ai_bp.post("/ai/hints")
@roles_required("student")
def hint():
    data = request.get_json(silent=True) or {}
    task, error = _task_from_payload(data)
    if error:
        return error
    return success({
        "hint": localized(task.hint),
        "reveals_answer": False,
        "source_skill_ids": [task.skill_id],
        "confidence": 1.0,
        "generated_by_ai": False,
        "model_version": "deterministic-fallback-v1",
    })

