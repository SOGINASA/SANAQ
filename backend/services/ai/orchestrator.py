from pathlib import Path

from flask import current_app

from services.ai.guardrails import redact_personal_data
from services.ai.ollama_client import OllamaClient


PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"


class SANAOrchestrator:
    def __init__(self, client=None):
        config = current_app.config
        self.client = client or OllamaClient(
            base_url=config["AI_BASE_URL"],
            model=config["AI_MODEL"],
            timeout=config["AI_TIMEOUT_SECONDS"],
            temperature=config["AI_TEMPERATURE"],
            max_tokens=config["AI_MAX_TOKENS"],
            context_tokens=config["AI_CONTEXT_TOKENS"],
            thinking=config["AI_THINKING"],
        )

    @staticmethod
    def _system_prompt(conversation):
        locale = "kk" if conversation.locale == "kk" else "ru"
        base_prompt = (PROMPTS_DIR / f"system_{locale}.txt").read_text(encoding="utf-8")
        context = (
            f"\n\nТекущий учебный контекст:\n"
            f"- Класс: {conversation.grade}\n"
            f"- Предмет: {conversation.subject}\n"
            f"- Тема: {conversation.topic}\n"
            f"- Полное решение пока не разрешено: сначала нужна попытка ученика."
        )
        return base_prompt + context

    def build_messages(self, conversation):
        messages = [{"role": "system", "content": self._system_prompt(conversation)}]
        for message in conversation.messages[-16:]:
            content, _flags = redact_personal_data(message.content)
            messages.append({"role": message.role, "content": content})
        return messages

    def stream(self, conversation):
        yield from self.stream_messages(self.build_messages(conversation))

    def stream_messages(self, messages):
        yield from self.client.stream_chat(messages)
