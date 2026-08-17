from math import ceil
from pathlib import Path

from flask import current_app

from services.ai.guardrails import redact_personal_data
from services.ai.ollama_client import OllamaClient


PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"


class SANAOrchestrator:
    def __init__(self, client=None):
        config = current_app.config
        self.context_tokens = config["AI_CONTEXT_TOKENS"]
        self.max_tokens = config["AI_MAX_TOKENS"]
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
        if locale == "kk":
            context = (
                f"\n\nАғымдағы оқу контексті:\n"
                f"- Сынып: {conversation.grade}\n"
                f"- Пән: {conversation.subject}\n"
                f"- Тақырып: {conversation.topic}\n"
                f"- Толық шешімді әзірге берме: алдымен оқушының әрекеті қажет."
            )
        else:
            context = (
                f"\n\nТекущий учебный контекст:\n"
                f"- Класс: {conversation.grade}\n"
                f"- Предмет: {conversation.subject}\n"
                f"- Тема: {conversation.topic}\n"
                f"- Полное решение пока не разрешено: сначала нужна попытка ученика."
            )
        return base_prompt + context

    def build_messages(self, conversation):
        system_prompt = self._system_prompt(conversation)
        messages = [{"role": "system", "content": system_prompt}]
        input_budget = max(256, self.context_tokens - self.max_tokens)
        remaining = max(0, input_budget - self._estimate_tokens(system_prompt))
        selected = []
        for message in reversed(conversation.messages[-16:]):
            content, _flags = redact_personal_data(message.content)
            estimated = self._estimate_tokens(content)
            if estimated <= remaining:
                selected.append({"role": message.role, "content": content})
                remaining -= estimated
                continue
            if not selected and remaining >= 32:
                selected.append({
                    "role": message.role,
                    "content": self._truncate_content(content, remaining * 2),
                })
            break
        messages.extend(reversed(selected))
        return messages

    @staticmethod
    def _estimate_tokens(content):
        """Conservative approximation for mixed Russian/Kazakh school text."""
        return max(1, ceil(len(content) / 2))

    @staticmethod
    def _truncate_content(content, character_limit):
        if len(content) <= character_limit:
            return content
        marker = "\n…[сообщение сокращено]…\n"
        available = max(0, character_limit - len(marker))
        head = round(available * 0.6)
        tail = available - head
        return content[:head] + marker + (content[-tail:] if tail else "")

    def stream(self, conversation):
        yield from self.stream_messages(self.build_messages(conversation))

    def stream_messages(self, messages):
        yield from self.client.stream_chat(messages)
