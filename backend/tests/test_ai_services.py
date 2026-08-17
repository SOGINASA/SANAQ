import json
from types import SimpleNamespace

import pytest
from sqlalchemy import inspect

from models import User, db
from services.ai.guardrails import urgent_safety_response
from services.ai.ollama_client import OllamaClient, OllamaError
from services.ai.orchestrator import SANAOrchestrator
from services.schema import ensure_runtime_schema


@pytest.mark.parametrize(
    ("content", "expected_fragment"),
    [
        ("Думаю о самоубийстве", "112"),
        ("У меня мысли о суициде", "112"),
        ("Я не хочу жить", "112"),
        ("Я хочу покончить с собой", "112"),
        ("Я убью себя", "112"),
        ("Өзімді өлтіргім келеді", "112"),
        ("Мен өмір сүргім келмейді", "112"),
        ("Өлгім келеді", "112"),
    ],
)
def test_guardrails_detect_high_risk_word_forms(content, expected_fragment):
    answer = urgent_safety_response(content)
    assert answer is not None
    assert expected_fragment in answer


def test_kazakh_high_risk_phrase_gets_kazakh_response_even_in_russian_chat():
    answer = urgent_safety_response("Өзімді өлтіргім келеді", locale="ru")
    assert "қауіпсіздігің" in answer


def test_orchestrator_applies_context_budget_and_redacts_pii(app):
    app.config.update(AI_CONTEXT_TOKENS=2048, AI_MAX_TOKENS=256)
    long_message = "начало " + ("очень длинный текст " * 250) + " child@example.com конец"
    conversation = SimpleNamespace(
        grade=9,
        subject="Математика",
        topic="Квадратные уравнения",
        locale="ru",
        messages=[SimpleNamespace(role="user", content=long_message)],
    )
    with app.app_context():
        orchestrator = SANAOrchestrator()
        messages = orchestrator.build_messages(conversation)

    estimated = sum(orchestrator._estimate_tokens(item["content"]) for item in messages)
    assert estimated <= app.config["AI_CONTEXT_TOKENS"] - app.config["AI_MAX_TOKENS"]
    assert messages[-1]["role"] == "user"
    assert "[сообщение сокращено]" in messages[-1]["content"]
    assert "child@example.com" not in messages[-1]["content"]


def test_kazakh_prompt_uses_kazakh_context_labels(app):
    conversation = SimpleNamespace(
        grade=9,
        subject="Математика",
        topic="Квадрат теңдеулер",
        locale="kk",
        messages=[],
    )
    with app.app_context():
        prompt = SANAOrchestrator._system_prompt(conversation)

    assert "Ағымдағы оқу контексті" in prompt
    assert "Текущий учебный контекст" not in prompt


def test_runtime_schema_creates_ai_tables_idempotently(app):
    with app.app_context():
        db.drop_all()
        User.__table__.create(bind=db.engine)

        ensure_runtime_schema()
        first_tables = set(inspect(db.engine).get_table_names())
        ensure_runtime_schema()
        second_tables = set(inspect(db.engine).get_table_names())

    assert {"users", "ai_conversations", "ai_messages"} <= first_tables
    assert first_tables == second_tables


class _FakeResponse:
    status = 200

    def __init__(self, events):
        self.events = events

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def __iter__(self):
        return iter(self.events)


def _client():
    return OllamaClient("http://ollama.test", "qwen3:8b", 1, 0.3, 100, 2048, False)


def test_ollama_client_rejects_non_object_stream_event(monkeypatch):
    response = _FakeResponse([json.dumps([]).encode() + b"\n"])
    monkeypatch.setattr("urllib.request.urlopen", lambda *_args, **_kwargs: response)

    with pytest.raises(OllamaError, match="invalid stream event"):
        list(_client().stream_chat([{"role": "user", "content": "test"}]))


@pytest.mark.parametrize(
    "event",
    [
        {"message": []},
        {"message": {"content": 42}},
    ],
)
def test_ollama_client_rejects_invalid_message_payload(monkeypatch, event):
    response = _FakeResponse([json.dumps(event).encode() + b"\n"])
    monkeypatch.setattr("urllib.request.urlopen", lambda *_args, **_kwargs: response)

    with pytest.raises(OllamaError, match="invalid message|non-text"):
        list(_client().stream_chat([{"role": "user", "content": "test"}]))


def test_ollama_client_rejects_stream_without_done_event(monkeypatch):
    response = _FakeResponse([b'{"message":{"content":"partial"}}\n'])
    monkeypatch.setattr("urllib.request.urlopen", lambda *_args, **_kwargs: response)

    with pytest.raises(OllamaError, match="before the done event"):
        list(_client().stream_chat([{"role": "user", "content": "test"}]))


def test_ollama_client_accepts_valid_completed_stream(monkeypatch):
    response = _FakeResponse([
        b'{"message":{"content":"one"},"done":false}\n',
        b'{"message":{"content":" two"},"done":true}\n',
    ])
    monkeypatch.setattr("urllib.request.urlopen", lambda *_args, **_kwargs: response)

    assert "".join(_client().stream_chat([{"role": "user", "content": "test"}])) == "one two"
