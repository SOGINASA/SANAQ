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
    assert response.status_code == 200
    assert message["generated_by_ai"] is False
    assert message["model_version"] == "deterministic-fallback-v1"
    assert "Ollama" in message["content"]


def test_teacher_cannot_access_student_chat(client, teacher_headers):
    response = client.get("/api/v1/ai/conversations", headers=teacher_headers)
    assert response.status_code == 403
