from datetime import datetime, timedelta, timezone

import json

from flask import Blueprint, Response, request
from flask_jwt_extended import get_jwt_identity

from models import AIConversation, AIMessage, Attempt, KnowledgeState, Skill, Task, TaskAnswer, db
from utils.decorators import roles_required
from utils.localization import localized
from utils.responses import api_error, success


ai_bp = Blueprint("ai", __name__)


def _message_payload(message):
    return {
        "id": message.id,
        "role": message.role,
        "content": message.content,
        "created_at": message.created_at.isoformat(),
    }


def _conversation_or_error(conversation_id):
    conversation = db.session.get(AIConversation, conversation_id)
    if not conversation:
        return None, api_error("CONVERSATION_NOT_FOUND", "Диалог не найден", 404)
    if conversation.student_id != get_jwt_identity():
        return None, api_error("FORBIDDEN", "Нет доступа к диалогу", 403)
    return conversation, None


def _tutor_reply(student_id, topic, question):
    state = db.session.scalar(
        db.select(KnowledgeState)
        .where(KnowledgeState.student_id == student_id)
        .order_by(KnowledgeState.mastery.asc())
    )
    skill = db.session.get(Skill, state.skill_id) if state else None
    focus = localized(skill.name) if skill else (topic or "текущая тема")
    normalized = question.lower()
    if any(word in normalized for word in ("ответ", "реши", "готовое")):
        return f"Не буду сразу выдавать готовый ответ. Для навыка «{focus}» сначала назови известные данные и формулу, которую можно применить."
    if any(word in normalized for word in ("пример", "жизн")):
        return f"Свяжем «{focus}» с простой ситуацией: разбей сложную задачу на известные части, вычисли каждую отдельно и затем проверь обратным действием."
    if any(word in normalized for word in ("проще", "не понимаю", "объясни")):
        return f"Объясню проще. В теме «{focus}» сначала найди повторяющуюся структуру, затем примени к ней одно правило. Пришли конкретное выражение — разберём следующий шаг."
    return f"Работаем с темой «{focus}». Что уже известно из условия и на каком шаге возникло затруднение? Я дам следующую подсказку без раскрытия ответа."


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


@ai_bp.post("/ai/conversations")
@roles_required("student")
def create_conversation():
    data = request.get_json(silent=True) or {}
    topic = str(data.get("topic", "")).strip()[:200] or None
    conversation = AIConversation(student_id=get_jwt_identity(), topic=topic)
    db.session.add(conversation)
    db.session.flush()
    welcome = AIMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=f"Готова помочь по теме «{topic}». С какого шага начнём?" if topic else "Готова помочь. Опиши задачу и место, где стало непонятно.",
    )
    db.session.add(welcome)
    db.session.commit()
    return success({
        "conversation": {"id": conversation.id, "topic": conversation.topic},
        "messages": [_message_payload(welcome)],
        "generated_by_ai": False,
        "model_version": "deterministic-tutor-v1",
    }, status=201)


@ai_bp.get("/ai/conversations")
@roles_required("student")
def list_conversations():
    conversations = db.session.scalars(
        db.select(AIConversation).where(AIConversation.student_id == get_jwt_identity())
        .order_by(AIConversation.updated_at.desc()).limit(30)
    ).all()
    return success({"items": [{
        "id": item.id, "topic": item.topic, "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    } for item in conversations]})


@ai_bp.get("/ai/conversations/<conversationId>")
@roles_required("student")
def get_conversation(conversationId):
    conversation, error = _conversation_or_error(conversationId)
    if error:
        return error
    messages = db.session.scalars(
        db.select(AIMessage)
        .where(AIMessage.conversation_id == conversation.id)
        .order_by(AIMessage.created_at, AIMessage.id)
    ).all()
    return success({
        "conversation": {"id": conversation.id, "topic": conversation.topic},
        "messages": [_message_payload(message) for message in messages],
    })


@ai_bp.get("/ai/conversations/<conversationId>/stream")
@roles_required("student")
def stream_conversation(conversationId):
    conversation, error = _conversation_or_error(conversationId)
    if error:
        return error
    messages = db.session.scalars(
        db.select(AIMessage).where(AIMessage.conversation_id == conversation.id)
        .order_by(AIMessage.created_at, AIMessage.id)
    ).all()

    def generate():
        for message in messages:
            yield f"event: message\ndata: {json.dumps(_message_payload(message), ensure_ascii=False)}\n\n"
        yield "event: done\ndata: {}\n\n"

    return Response(generate(), mimetype="text/event-stream", headers={"Cache-Control": "no-cache"})


@ai_bp.post("/ai/conversations/<conversationId>/messages")
@roles_required("student")
def send_conversation_message(conversationId):
    conversation, error = _conversation_or_error(conversationId)
    if error:
        return error
    data = request.get_json(silent=True) or {}
    content = str(data.get("content", "")).strip()
    if not content or len(content) > 2000:
        return api_error("VALIDATION_ERROR", "Сообщение должно содержать от 1 до 2000 символов", 422)
    message_time = datetime.now(timezone.utc)
    user_message = AIMessage(
        conversation_id=conversation.id, role="user", content=content, created_at=message_time,
    )
    assistant_message = AIMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=_tutor_reply(conversation.student_id, conversation.topic, content),
        created_at=message_time + timedelta(microseconds=1),
    )
    db.session.add_all([user_message, assistant_message])
    db.session.commit()
    return success({
        "user_message": _message_payload(user_message),
        "assistant_message": _message_payload(assistant_message),
        "generated_by_ai": False,
        "model_version": "deterministic-tutor-v1",
        "warning": "Ответ сформирован серверным учебным движком; внешняя генеративная модель не используется.",
    }, status=201)
