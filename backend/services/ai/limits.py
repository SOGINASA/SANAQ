from datetime import datetime, timedelta, timezone
from math import ceil

from flask import current_app
from sqlalchemy import func

from models import AIConversation, AIMessage, db


class AILimitExceeded(RuntimeError):
    def __init__(self, code, message, retry_after):
        super().__init__(message)
        self.code = code
        self.message = message
        self.retry_after = max(1, int(retry_after))


def _estimated_tokens(content):
    return max(1, ceil(len(content or "") / 2))


def enforce_ai_limits(student_id):
    now = datetime.now(timezone.utc)
    per_minute = int(current_app.config.get("AI_RATE_LIMIT_PER_MINUTE", 10))
    if per_minute > 0:
        recent_messages = db.session.scalar(
            db.select(func.count(AIMessage.id))
            .join(AIConversation, AIMessage.conversation_id == AIConversation.id)
            .where(
                AIConversation.student_id == student_id,
                AIMessage.role == "user",
                AIMessage.created_at >= now - timedelta(minutes=1),
            )
        ) or 0
        if recent_messages >= per_minute:
            raise AILimitExceeded(
                "AI_RATE_LIMITED",
                "Слишком много запросов к AI-помощнику. Попробуй через минуту.",
                60,
            )

    daily_limit = int(current_app.config.get("AI_DAILY_TOKEN_LIMIT", 20_000))
    if daily_limit <= 0:
        return
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    generated_messages = db.session.scalars(
        db.select(AIMessage)
        .join(AIConversation, AIMessage.conversation_id == AIConversation.id)
        .where(
            AIConversation.student_id == student_id,
            AIMessage.role == "assistant",
            AIMessage.generated_by_ai.is_(True),
            AIMessage.created_at >= day_start,
        )
    ).all()
    used_tokens = sum(_estimated_tokens(message.content) for message in generated_messages)
    if used_tokens >= daily_limit:
        next_day = day_start + timedelta(days=1)
        raise AILimitExceeded(
            "AI_DAILY_TOKEN_LIMIT",
            "Дневной лимит AI-помощника исчерпан. Попробуй снова завтра.",
            (next_day - now).total_seconds(),
        )
