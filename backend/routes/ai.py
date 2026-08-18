import json
import time

from flask import Blueprint, Response, current_app, request, stream_with_context
from flask_jwt_extended import get_jwt_identity

from models import AIConversation, AIMessage, Attempt, Task, TaskAnswer, db, utc_now
from services.ai import AIProviderError, SANAOrchestrator
from services.ai.fallback import fallback_answer
from services.ai.guardrails import urgent_safety_response, validate_user_message
from services.ai.limits import AILimitExceeded, enforce_ai_limits
from utils.decorators import roles_required
from utils.localization import localized
from utils.responses import api_error, success


ai_bp = Blueprint("ai", __name__)


def _owned_conversation(conversation_id):
    conversation = db.session.get(AIConversation, conversation_id)
    if not conversation:
        return None, api_error("CONVERSATION_NOT_FOUND", "Диалог не найден", 404)
    if conversation.student_id != get_jwt_identity():
        return None, api_error("FORBIDDEN", "Нет доступа к диалогу", 403)
    return conversation, None


def _save_assistant_message(conversation, content, started_at, generated_by_ai, model_version):
    message = AIMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=content,
        generated_by_ai=generated_by_ai,
        model_version=model_version,
        prompt_version=current_app.config["AI_PROMPT_VERSION"],
        latency_ms=round((time.monotonic() - started_at) * 1000),
    )
    conversation.updated_at = utc_now()
    db.session.add(message)
    db.session.commit()
    return message


def _sse(event, payload):
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


@ai_bp.get("/ai/conversations")
@roles_required("student")
def conversations():
    items = db.session.scalars(
        db.select(AIConversation)
        .where(
            AIConversation.student_id == get_jwt_identity(),
            AIConversation.status == "active",
        )
        .order_by(AIConversation.updated_at.desc())
        .limit(50)
    ).all()
    return success({"items": [item.to_dict() for item in items], "total": len(items)})


@ai_bp.post("/ai/conversations")
@roles_required("student")
def create_conversation():
    data = request.get_json(silent=True) or {}
    try:
        grade = int(data.get("grade", 9))
    except (TypeError, ValueError):
        return api_error("VALIDATION_ERROR", "Класс должен быть числом от 7 до 12", 422)
    if grade not in range(7, 13):
        return api_error("VALIDATION_ERROR", "Допустимы классы с 7 по 12", 422)

    locale = str(data.get("locale") or request.accept_languages.best_match(["ru", "kk"]) or "ru")
    if locale not in {"ru", "kk"}:
        locale = "ru"
    conversation = AIConversation(
        student_id=get_jwt_identity(),
        title=str(data.get("title") or "Новый диалог").strip()[:120] or "Новый диалог",
        subject=str(data.get("subject") or "Математика").strip()[:80],
        topic=str(data.get("topic") or "Общий вопрос").strip()[:160],
        grade=grade,
        locale=locale,
    )
    db.session.add(conversation)
    legacy_client = bool(data.get("topic")) and "subject" not in data and "grade" not in data
    if legacy_client:
        db.session.flush()
        db.session.add(AIMessage(
            conversation_id=conversation.id,
            role="assistant",
            content=f"Готова помочь по теме «{conversation.topic}». С какого шага начнём?",
            generated_by_ai=False,
            model_version="deterministic-tutor-v1",
        ))
    db.session.commit()
    payload = conversation.to_dict(include_messages=True)
    payload["conversation"] = conversation.to_dict()
    return success(payload, status=201)


@ai_bp.get("/ai/conversations/<conversationId>")
@roles_required("student")
def conversation_details(conversationId):
    conversation, error = _owned_conversation(conversationId)
    if error:
        return error
    return success(conversation.to_dict(include_messages=True))


def _stream_model_answer(conversation_id, locale, orchestrator, model_messages, safety_answer=None):
    started_at = time.monotonic()
    chunks = []
    has_visible_content = False
    generated_by_ai = safety_answer is None
    model_version = current_app.config["AI_MODEL"] if generated_by_ai else "safety-policy-v1"
    fallback_used = False
    failure_code = None

    try:
        source = [safety_answer] if safety_answer else orchestrator.stream_messages(model_messages)
        for chunk in source:
            chunks.append(chunk)
            has_visible_content = has_visible_content or bool(chunk.strip())
            yield _sse("token", {"text": chunk})
        content = "".join(chunks).strip()
        if not content:
            raise AIProviderError("AI provider returned an empty response")
    except AIProviderError as error:
        if has_visible_content:
            current_app.logger.warning("AI stream interrupted after partial response: %s", error)
            yield _sse("error", {
                "code": "AI_STREAM_INTERRUPTED",
                "message": "Ответ SANA прервался. Попробуй отправить сообщение ещё раз.",
                "fallback_used": False,
            })
            return
        current_app.logger.warning("AI stream fallback used: %s", error)
        content = fallback_answer(locale)
        generated_by_ai = False
        model_version = "deterministic-fallback-v1"
        fallback_used = True
        failure_code = "ai_provider_unavailable"
        yield _sse("token", {"text": content})

    conversation = db.session.get(AIConversation, conversation_id)
    if not conversation:
        yield _sse("error", {"message": "Диалог был удалён во время ответа"})
        return
    message = _save_assistant_message(conversation, content, started_at, generated_by_ai, model_version)
    done_payload = {
        "message": message.to_dict(),
        "warning": "SANA может ошибаться — проверяй важные факты и решения.",
        "fallback_used": fallback_used,
    }
    if failure_code:
        done_payload["failure_code"] = failure_code
    yield _sse("done", done_payload)


@ai_bp.post("/ai/conversations/<conversationId>/messages")
@roles_required("student")
def send_conversation_message(conversationId):
    conversation, error = _owned_conversation(conversationId)
    if error:
        return error
    data = request.get_json(silent=True) or {}
    try:
        enforce_ai_limits(get_jwt_identity())
    except AILimitExceeded as error:
        response, status = api_error(error.code, error.message, 429)
        response.headers["Retry-After"] = str(error.retry_after)
        return response, status
    try:
        content = validate_user_message(data.get("content"))
    except ValueError as error:
        return api_error("VALIDATION_ERROR", str(error), 422)

    legacy_client = any(
        item.model_version == "deterministic-tutor-v1" for item in conversation.messages
    )
    user_message = AIMessage(
        conversation_id=conversation.id,
        role="user",
        content=content,
        generated_by_ai=False,
    )
    if conversation.title == "Новый диалог":
        conversation.title = content[:57] + ("…" if len(content) > 57 else "")
    conversation.updated_at = utc_now()
    db.session.add(user_message)
    db.session.commit()

    safety_answer = urgent_safety_response(content, conversation.locale)
    wants_stream = data.get("stream") is True or "text/event-stream" in request.headers.get("Accept", "")
    if wants_stream:
        orchestrator = SANAOrchestrator()
        model_messages = None if safety_answer else orchestrator.build_messages(conversation)
        response = Response(
            stream_with_context(_stream_model_answer(
                conversation.id,
                conversation.locale,
                orchestrator,
                model_messages,
                safety_answer,
            )),
            mimetype="text/event-stream",
        )
        response.headers["Cache-Control"] = "no-cache, no-transform"
        response.headers["X-Accel-Buffering"] = "no"
        return response

    started_at = time.monotonic()
    generated_by_ai = safety_answer is None
    model_version = current_app.config["AI_MODEL"] if generated_by_ai else "safety-policy-v1"
    try:
        content_chunks = [safety_answer] if safety_answer else SANAOrchestrator().stream(conversation)
        answer = "".join(content_chunks).strip()
        if not answer:
            raise AIProviderError("AI provider returned an empty response")
    except AIProviderError as error:
        current_app.logger.warning("AI fallback used: %s", error)
        answer = fallback_answer(conversation.locale)
        generated_by_ai = False
        model_version = "deterministic-fallback-v1"
    assistant_message = _save_assistant_message(
        conversation, answer, started_at, generated_by_ai, model_version
    )
    payload = {
        "message": assistant_message.to_dict(),
        "warning": "SANA может ошибаться — проверяй важные факты и решения.",
        "fallback_used": not generated_by_ai and model_version == "deterministic-fallback-v1",
    }
    if payload["fallback_used"]:
        payload["failure_code"] = "ai_provider_unavailable"
    if legacy_client:
        payload.update({
            "user_message": user_message.to_dict(),
            "assistant_message": assistant_message.to_dict(),
            "generated_by_ai": assistant_message.generated_by_ai,
            "model_version": assistant_message.model_version,
        })
    return success(payload, status=201 if legacy_client else 200)


@ai_bp.get("/ai/conversations/<conversationId>/stream")
@roles_required("student")
def conversation_stream(conversationId):
    conversation, error = _owned_conversation(conversationId)
    if error:
        return error
    latest = next((item for item in reversed(conversation.messages) if item.role == "assistant"), None)
    if not latest:
        return api_error("MESSAGE_NOT_FOUND", "В диалоге ещё нет ответа SANA", 404)

    def replay():
        yield _sse("token", {"text": latest.content})
        yield _sse("done", {"message": latest.to_dict()})

    return Response(stream_with_context(replay()), mimetype="text/event-stream")


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
        return {"title": "Разберём по шагам", "steps": [localized(task.hint), explanation]}
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
        "model_version": "content-tutor-v1",
        "warning": "Объяснение сформировано серверным учебным движком по проверенному контенту.",
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
        "model_version": "content-tutor-v1",
    })
