from services.ai.errors import AIConfigurationError
from services.ai.groq_client import GroqClient
from services.ai.ollama_client import OllamaClient


def create_ai_client(config):
    provider = str(config.get("AI_PROVIDER", "ollama")).strip().lower()
    common = {
        "base_url": config["AI_BASE_URL"],
        "model": config["AI_MODEL"],
        "timeout": config["AI_TIMEOUT_SECONDS"],
        "temperature": config["AI_TEMPERATURE"],
        "max_tokens": config["AI_MAX_TOKENS"],
    }
    if provider == "groq":
        return GroqClient(api_key=config.get("AI_API_KEY", ""), **common)
    if provider == "ollama":
        return OllamaClient(
            context_tokens=config["AI_CONTEXT_TOKENS"],
            thinking=config["AI_THINKING"],
            **common,
        )
    raise AIConfigurationError(f"Unsupported AI provider: {provider}")
