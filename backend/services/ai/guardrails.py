import re


MAX_USER_MESSAGE_LENGTH = 4000

_PII_PATTERNS = (
    (re.compile(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b"), "[email скрыт]"),
    (re.compile(r"(?<!\d)(?:\+?7|8)[\s()-]*\d{3}[\s()-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}(?!\d)"), "[телефон скрыт]"),
)

_HIGH_RISK_PATTERNS = {
    "ru": (
        re.compile(r"(?<!\w)суицид\w*", re.IGNORECASE),
        re.compile(r"(?<!\w)самоубийств\w*", re.IGNORECASE),
        re.compile(r"(?<!\w)уби(?:ть|ваю|й)\s+себя(?!\w)", re.IGNORECASE),
        re.compile(r"(?<!\w)убью\s+себя(?!\w)", re.IGNORECASE),
        re.compile(r"(?<!\w)не\s+хочу\s+жить(?!\w)", re.IGNORECASE),
        re.compile(r"(?<!\w)(?:хочу|собираюсь)\s+(?:умереть|покончить\s+с\s+собой)", re.IGNORECASE),
        re.compile(r"(?<!\w)покончить\s+с\s+собой(?!\w)", re.IGNORECASE),
    ),
    "kk": (
        re.compile(r"(?<!\w)өзімді\s+өлтір\w*", re.IGNORECASE),
        re.compile(r"(?<!\w)өмір\s+сүргім\s+келме\w*", re.IGNORECASE),
        re.compile(r"(?<!\w)өлгім\s+келеді(?!\w)", re.IGNORECASE),
        re.compile(r"(?<!\w)өзіме\s+қол\s+жұмса\w*", re.IGNORECASE),
    ),
}


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
    matched_locale = next(
        (
            language
            for language, patterns in _HIGH_RISK_PATTERNS.items()
            if any(pattern.search(content) for pattern in patterns)
        ),
        None,
    )
    if not matched_locale:
        return None
    response_locale = "kk" if matched_locale == "kk" else locale
    if response_locale == "kk":
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
