import json
import urllib.error
import urllib.request


class OllamaError(RuntimeError):
    pass


class OllamaClient:
    def __init__(self, base_url, model, timeout, temperature, max_tokens, context_tokens, thinking):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.context_tokens = context_tokens
        self.thinking = thinking

    def stream_chat(self, messages):
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "think": self.thinking,
            "keep_alive": "10m",
            "options": {
                "temperature": self.temperature,
                "num_predict": self.max_tokens,
                "num_ctx": self.context_tokens,
            },
        }
        request = urllib.request.Request(
            f"{self.base_url}/api/chat",
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            completed = False
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                for raw_line in response:
                    if not raw_line.strip():
                        continue
                    event = json.loads(raw_line.decode("utf-8"))
                    if not isinstance(event, dict):
                        raise OllamaError("Ollama returned an invalid stream event")
                    if event.get("error"):
                        raise OllamaError(event["error"])
                    message = event.get("message", {})
                    if not isinstance(message, dict):
                        raise OllamaError("Ollama returned an invalid message payload")
                    content = message.get("content", "")
                    if not isinstance(content, str):
                        raise OllamaError("Ollama returned non-text content")
                    if content:
                        yield content
                    if event.get("done") is True:
                        completed = True
            if not completed:
                raise OllamaError("Ollama stream ended before the done event")
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as error:
            raise OllamaError(f"Ollama unavailable: {error}") from error

    def health(self):
        try:
            with urllib.request.urlopen(f"{self.base_url}/api/tags", timeout=2) as response:
                return response.status == 200
        except (urllib.error.URLError, TimeoutError, OSError):
            return False
