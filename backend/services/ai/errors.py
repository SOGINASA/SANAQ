class AIProviderError(RuntimeError):
    """Safe, provider-neutral error exposed to the AI orchestration layer."""


class AIConfigurationError(AIProviderError):
    """Raised when the selected AI provider is not configured correctly."""
