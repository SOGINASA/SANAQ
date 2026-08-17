import re


MAX_USER_MESSAGE_LENGTH = 4000

_PII_PATTERNS = (
    (re.compile(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b"), "[email скрыт]"),
    (re.compile(r"(?<!\d)(?:\+?7|8)[\s()-]*\d{3}[\s()-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}(?!\d)"), "[телефон скрыт]"),
)

_HIGH_RISK_PATTERNS = (
    re.compile(r"\b(?:суицид|самоубийств|убить себя|не хочу жить)\b", re.IGNORECASE),
    re.compile(r"\b(?:өзімді өлтір|өмір сүргім келмейді)\b", re.IGNORECASE),
)


def validate_user_message(content):
    if not isinstance(content, str) or not content.strip():
        raise ValueError("Сообщение не может быть пустым")
    cleaned = content.strip()
    if len(cleaned) > MAX_USER_MESSAGE_LENGTH:
        raise ValueError(f"Сообщение должно быть короче {MAX_USER_MESSAGE_LENGTH} символов")
    return cleaned


def redact_personal_data(content):
    redacted = content
    flags = []
    for pattern, replacement in _PII_PATTERNS:
        redacted, count = pattern.subn(replacement, redacted)
        if count:
            flags.append("pii_redacted")
    return redacted, sorted(set(flags))


def urgent_safety_response(content, locale="ru"):
    if not any(pattern.search(content) for pattern in _HIGH_RISK_PATTERNS):
        return None
    if locale == "kk":
        return (
            "Маған сенің қауіпсіздігің маңызды. Қазір жалғыз қалма: сенетін ересек адамға — "
            "ата-анаңа, мұғалімге немесе мектеп психологына — бірден айт. Егер дәл қазір қауіп бар "
            "болса, Қазақстандағы 112 нөміріне хабарлас."
        )
    return (
        "Мне важна твоя безопасность. Пожалуйста, не оставайся сейчас один: сразу расскажи "
        "взрослому, которому доверяешь — родителю, учителю или школьному психологу. Если опасность "
        "есть прямо сейчас, позвони 112 в Казахстане."
    )
