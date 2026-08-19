import json
import urllib.error
import urllib.request

from services.ai.errors import AIProviderError


class GroqError(AIProviderError):
    pass


class GroqClient:
    def __init__(self, base_url, api_key, model, timeout, temperature, max_tokens):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.temperature = temperature
        self.max_tokens = max_tokens

    @staticmethod
    def _iter_sse_payloads(response):
        data_lines = []
        for raw_line in response:
            line = raw_line.decode("utf-8").rstrip("\r\n")
            if not line:
                if data_lines:
                    yield "\n".join(data_lines)
                    data_lines = []
                continue
            if line.startswith("data:"):
                data_lines.append(line[5:].lstrip())
        if data_lines:
            yield "\n".join(data_lines)

    def stream_chat(self, messages):
        if not self.api_key:
            raise GroqError("Groq API key is not configured")

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "temperature": self.temperature,
            "max_completion_tokens": self.max_tokens,
        }
        request = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
            },
            method="POST",
        )

        try:
            completed = False
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                for raw_payload in self._iter_sse_payloads(response):
                    if raw_payload == "[DONE]":
                        completed = True
                        break
                    event = json.loads(raw_payload)
                    if not isinstance(event, dict):
                        raise GroqError("Groq returned an invalid stream event")
                    if event.get("error"):
                        raise GroqError("Groq returned a stream error")
                    choices = event.get("choices")
                    if not isinstance(choices, list) or not choices:
                        raise GroqError("Groq returned an invalid choices payload")
                    delta = choices[0].get("delta") if isinstance(choices[0], dict) else None
                    if not isinstance(delta, dict):
                        raise GroqError("Groq returned an invalid delta payload")
                    content = delta.get("content")
                    if content is None:
                        continue
                    if not isinstance(content, str):
                        raise GroqError("Groq returned non-text content")
                    if content:
                        yield content
            if not completed:
                raise GroqError("Groq stream ended before the done event")
        except urllib.error.HTTPError as error:
            raise GroqError(f"Groq request failed with HTTP status {error.code}") from error
        except (
            urllib.error.URLError,
            TimeoutError,
            UnicodeDecodeError,
            json.JSONDecodeError,
            OSError,
        ) as error:
            raise GroqError(f"Groq unavailable: {type(error).__name__}") from error

    def health(self):
        if not self.api_key:
            return False
        request = urllib.request.Request(
            f"{self.base_url}/models",
            headers={"Authorization": f"Bearer {self.api_key}"},
            method="GET",
        )
        try:
            with urllib.request.urlopen(request, timeout=min(self.timeout, 2)) as response:
                return response.status == 200
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError):
            return False
