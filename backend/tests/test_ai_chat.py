import urllib.error

from services.ai.ollama_client import OllamaClient, OllamaError


def test_student_can_create_chat_and_receive_streamed_qwen_answer(
    client, student_headers, monkeypatch
):
    monkeypatch.setattr(
        OllamaClient,
        "stream_chat",
        lambda _self, _messages: iter(["Проверим ", "первый шаг."]),
    )
    created = client.post(
        "/api/v1/ai/conversations",
        headers=student_headers,
        json={"subject": "Математика", "topic": "Разность квадратов", "grade": 9},
    )
    assert created.status_code == 201
    conversation_id = created.get_json()["data"]["id"]

    response = client.post(
        f"/api/v1/ai/conversations/{conversation_id}/messages",
        headers={**student_headers, "Accept": "text/event-stream"},
        json={"content": "Как начать решение?", "stream": True},
    )
    body = response.get_data(as_text=True)
    assert response.status_code == 200
    assert response.mimetype == "text/event-stream"
    assert "Проверим " in body
    assert "первый шаг." in body
    assert "event: done" in body

    history = client.get(
        f"/api/v1/ai/conversations/{conversation_id}", headers=student_headers
    ).get_json()["data"]
    assert [message["role"] for message in history["messages"]] == ["user", "assistant"]
    assert history["messages"][1]["content"] == "Проверим первый шаг."
    assert history["messages"][1]["generated_by_ai"] is True


def test_chat_uses_explicit_fallback_when_ollama_is_unavailable(
    client, student_headers, monkeypatch
):
    def unavailable(_self, _messages):
        raise OllamaError("offline")
        yield  # pragma: no cover

    monkeypatch.setattr(OllamaClient, "stream_chat", unavailable)
    conversation_id = client.post(
        "/api/v1/ai/conversations", headers=student_headers, json={}
    ).get_json()["data"]["id"]
    response = client.post(
        f"/api/v1/ai/conversations/{conversation_id}/messages",
        headers=student_headers,
        json={"content": "Помоги с задачей"},
    )
    message = response.get_json()["data"]["message"]
    payload = response.get_json()["data"]
    assert response.status_code == 200
    assert message["generated_by_ai"] is False
    assert message["model_version"] == "deterministic-fallback-v1"
    assert message["fallback_used"] is True
    assert message["failure_code"] == "ai_provider_unavailable"
    assert payload["fallback_used"] is True
    assert payload["failure_code"] == "ai_provider_unavailable"
    assert "временно недоступен" in message["content"]


def test_stream_uses_fallback_when_ollama_fails_before_first_token(
    client, student_headers, monkeypatch
):
    def unavailable(_self, _messages):
        raise OllamaError("offline")
        yield  # pragma: no cover

    monkeypatch.setattr(OllamaClient, "stream_chat", unavailable)
    conversation_id = client.post(
        "/api/v1/ai/conversations", headers=student_headers, json={}
    ).get_json()["data"]["id"]
    response = client.post(
        f"/api/v1/ai/conversations/{conversation_id}/messages",
        headers={**student_headers, "Accept": "text/event-stream"},
        json={"content": "Помоги с задачей", "stream": True},
    )

    body = response.get_data(as_text=True)
    assert "deterministic-fallback-v1" in body
    assert '"fallback_used": true' in body
    assert '"failure_code": "ai_provider_unavailable"' in body
    assert "event: done" in body
    assert "event: error" not in body


def test_stream_uses_fallback_after_whitespace_only_response(
    client, student_headers, monkeypatch
):
    monkeypatch.setattr(OllamaClient, "stream_chat", lambda _self, _messages: iter(["  "]))
    conversation_id = client.post(
        "/api/v1/ai/conversations", headers=student_headers, json={}
    ).get_json()["data"]["id"]
    response = client.post(
        f"/api/v1/ai/conversations/{conversation_id}/messages",
        headers={**student_headers, "Accept": "text/event-stream"},
        json={"content": "Помоги с задачей", "stream": True},
    )

    body = response.get_data(as_text=True)
    assert "deterministic-fallback-v1" in body
    assert "event: done" in body
    assert "event: error" not in body


def test_stream_marks_fallback_for_invalid_provider_configuration(
    app, client, student_headers
):
    app.config["AI_PROVIDER"] = "unknown"
    conversation_id = client.post(
        "/api/v1/ai/conversations", headers=student_headers, json={}
    ).get_json()["data"]["id"]
    response = client.post(
        f"/api/v1/ai/conversations/{conversation_id}/messages",
        headers={**student_headers, "Accept": "text/event-stream"},
        json={"content": "Помоги с задачей", "stream": True},
    )

    body = response.get_data(as_text=True)
    assert response.status_code == 200
    assert '"fallback_used": true' in body
    assert '"failure_code": "ai_provider_unavailable"' in body
    assert "event: done" in body


def test_groq_failure_fallback_does_not_leak_api_key(
    app, client, student_headers, monkeypatch, caplog
):
    secret = "test-groq-key-must-not-leak"
    app.config.update(
        AI_PROVIDER="groq",
        AI_BASE_URL="https://api.groq.test/openai/v1",
        AI_API_KEY=secret,
        AI_MODEL="test-model",
    )

    def rate_limited(request, **_kwargs):
        raise urllib.error.HTTPError(request.full_url, 429, "Rate limited", {}, None)

    monkeypatch.setattr("urllib.request.urlopen", rate_limited)
    conversation_id = client.post(
        "/api/v1/ai/conversations", headers=student_headers, json={}
    ).get_json()["data"]["id"]
    response = client.post(
        f"/api/v1/ai/conversations/{conversation_id}/messages",
        headers=student_headers,
        json={"content": "Помоги с задачей"},
    )

    body = response.get_data(as_text=True)
    assert response.status_code == 200
    assert '"fallback_used":true' in body
    assert '"failure_code":"ai_provider_unavailable"' in body
    assert secret not in body
    assert secret not in caplog.text


def test_partial_stream_failure_is_reported_and_not_persisted(
    client, student_headers, monkeypatch
):
    def interrupted(_self, _messages):
        yield "Незавершённый фрагмент"
        raise OllamaError("connection lost")

    monkeypatch.setattr(OllamaClient, "stream_chat", interrupted)
    conversation_id = client.post(
        "/api/v1/ai/conversations", headers=student_headers, json={}
    ).get_json()["data"]["id"]
    response = client.post(
        f"/api/v1/ai/conversations/{conversation_id}/messages",
        headers={**student_headers, "Accept": "text/event-stream"},
        json={"content": "Помоги с задачей", "stream": True},
    )

    body = response.get_data(as_text=True)
    assert "Незавершённый фрагмент" in body
    assert "event: error" in body
    assert "AI_STREAM_INTERRUPTED" in body
    assert "event: done" not in body
    history = client.get(
        f"/api/v1/ai/conversations/{conversation_id}", headers=student_headers
    ).get_json()["data"]
    assert [message["role"] for message in history["messages"]] == ["user"]


def test_teacher_cannot_access_student_chat(client, teacher_headers):
    response = client.get("/api/v1/ai/conversations", headers=teacher_headers)
    assert response.status_code == 403


def test_ai_rate_limit_returns_429_before_provider_call(
    app, client, student_headers, monkeypatch
):
    app.config.update(AI_RATE_LIMIT_PER_MINUTE=1, AI_DAILY_TOKEN_LIMIT=20_000)
    calls = 0

    def answer(_self, _messages):
        nonlocal calls
        calls += 1
        return iter(["Первый ответ"])

    monkeypatch.setattr(OllamaClient, "stream_chat", answer)
    conversation_id = client.post(
        "/api/v1/ai/conversations", headers=student_headers, json={}
    ).get_json()["data"]["id"]
    first = client.post(
        f"/api/v1/ai/conversations/{conversation_id}/messages",
        headers=student_headers,
        json={"content": "Первый вопрос"},
    )
    second = client.post(
        f"/api/v1/ai/conversations/{conversation_id}/messages",
        headers=student_headers,
        json={"content": "Второй вопрос"},
    )

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.get_json()["error"]["code"] == "AI_RATE_LIMITED"
    assert second.headers["Retry-After"] == "60"
    assert calls == 1


def test_ai_daily_token_limit_returns_429_before_provider_call(
    app, client, student_headers, monkeypatch
):
    app.config.update(AI_RATE_LIMIT_PER_MINUTE=0, AI_DAILY_TOKEN_LIMIT=1)
    calls = 0

    def answer(_self, _messages):
        nonlocal calls
        calls += 1
        return iter(["Ответ длиннее одного токена"])

    monkeypatch.setattr(OllamaClient, "stream_chat", answer)
    conversation_id = client.post(
        "/api/v1/ai/conversations", headers=student_headers, json={}
    ).get_json()["data"]["id"]
    first = client.post(
        f"/api/v1/ai/conversations/{conversation_id}/messages",
        headers=student_headers,
        json={"content": "Первый вопрос"},
    )
    second = client.post(
        f"/api/v1/ai/conversations/{conversation_id}/messages",
        headers=student_headers,
        json={"content": "Второй вопрос"},
    )

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.get_json()["error"]["code"] == "AI_DAILY_TOKEN_LIMIT"
    assert int(second.headers["Retry-After"]) > 0
    assert calls == 1
