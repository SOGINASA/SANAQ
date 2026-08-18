import json
import urllib.error
from types import SimpleNamespace

import pytest
from sqlalchemy import inspect

from models import User, db
from services.ai.client_factory import create_ai_client
from services.ai.errors import AIConfigurationError
from services.ai.groq_client import GroqClient, GroqError
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


def _groq_client(api_key="test-secret-key"):
    return GroqClient("https://api.groq.test/openai/v1", api_key, "test-model", 1, 0.3, 100)


def test_client_factory_selects_groq_without_exposing_api_key(app):
    app.config.update(
        AI_PROVIDER="groq",
        AI_BASE_URL="https://api.groq.test/openai/v1",
        AI_API_KEY="test-secret-key",
        AI_MODEL="test-model",
    )
    client = create_ai_client(app.config)

    assert isinstance(client, GroqClient)
    assert client.api_key == "test-secret-key"


def test_client_factory_rejects_unknown_provider(app):
    app.config["AI_PROVIDER"] = "unknown"

    with pytest.raises(AIConfigurationError, match="Unsupported AI provider"):
        create_ai_client(app.config)


def test_groq_client_accepts_valid_completed_sse_stream(monkeypatch):
    response = _FakeResponse([
        b'data: {"choices":[{"delta":{"content":"one"}}]}\n',
        b'\n',
        b'data: {"choices":[{"delta":{"content":" two"}}]}\n',
        b'\n',
        b'data: [DONE]\n',
        b'\n',
    ])
    monkeypatch.setattr("urllib.request.urlopen", lambda *_args, **_kwargs: response)

    assert "".join(_groq_client().stream_chat([{"role": "user", "content": "test"}])) == "one two"


def test_groq_client_sends_backend_authorization_header(monkeypatch):
    captured = {}

    def fake_urlopen(request, **_kwargs):
        captured["request"] = request
        return _FakeResponse([b"data: [DONE]\n", b"\n"])

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    list(_groq_client().stream_chat([{"role": "user", "content": "test"}]))

    assert captured["request"].full_url == "https://api.groq.test/openai/v1/chat/completions"
    assert captured["request"].get_header("Authorization") == "Bearer test-secret-key"


def test_groq_client_rejects_stream_without_done_event(monkeypatch):
    response = _FakeResponse([
        b'data: {"choices":[{"delta":{"content":"partial"}}]}\n',
        b'\n',
    ])
    monkeypatch.setattr("urllib.request.urlopen", lambda *_args, **_kwargs: response)

    with pytest.raises(GroqError, match="before the done event"):
        list(_groq_client().stream_chat([{"role": "user", "content": "test"}]))


@pytest.mark.parametrize("status", [401, 429])
def test_groq_http_error_does_not_leak_api_key(monkeypatch, status):
    def failed_request(request, **_kwargs):
        raise urllib.error.HTTPError(request.full_url, status, "Request failed", {}, None)

    monkeypatch.setattr("urllib.request.urlopen", failed_request)

    with pytest.raises(GroqError) as error:
        list(_groq_client().stream_chat([{"role": "user", "content": "test"}]))

    assert "test-secret-key" not in str(error.value)


def test_groq_timeout_is_safe_and_explicit(monkeypatch):
    monkeypatch.setattr(
        "urllib.request.urlopen",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(TimeoutError("test-secret-key")),
    )

    with pytest.raises(GroqError, match="TimeoutError") as error:
        list(_groq_client().stream_chat([{"role": "user", "content": "test"}]))

    assert "test-secret-key" not in str(error.value)


def test_groq_partial_stream_raises_after_returning_first_token(monkeypatch):
    def interrupted_events():
        yield b'data: {"choices":[{"delta":{"content":"partial"}}]}\n'
        yield b"\n"
        raise TimeoutError("connection lost")

    monkeypatch.setattr(
        "urllib.request.urlopen", lambda *_args, **_kwargs: _FakeResponse(interrupted_events())
    )
    stream = _groq_client().stream_chat([{"role": "user", "content": "test"}])

    assert next(stream) == "partial"
    with pytest.raises(GroqError, match="TimeoutError"):
        next(stream)


def test_groq_requires_backend_api_key_before_network_call(monkeypatch):
    called = False

    def unexpected_call(*_args, **_kwargs):
        nonlocal called
        called = True

    monkeypatch.setattr("urllib.request.urlopen", unexpected_call)

    with pytest.raises(GroqError, match="not configured"):
        list(_groq_client(api_key="").stream_chat([{"role": "user", "content": "test"}]))
    assert called is False


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
