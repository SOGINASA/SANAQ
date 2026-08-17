from fractions import Fraction


class TaskValidationError(ValueError):
    pass


def _require_localized(value, field):
    if not isinstance(value, dict) or any(
        not isinstance(value.get(locale), str) or not value[locale].strip()
        for locale in ("ru", "kk")
    ):
        raise TaskValidationError(f"{field} must contain non-empty ru and kk")


def _fraction(value):
    try:
        return Fraction(str(value).strip().replace(",", "."))
    except (ValueError, ZeroDivisionError) as error:
        raise TaskValidationError("answer must be a finite rational number") from error


def _validate_math(payload):
    spec = payload.get("validator_payload")
    if not isinstance(spec, dict):
        raise TaskValidationError("validator_payload is required")
    kind = spec.get("kind")
    if kind == "linear_equation":
        expected = Fraction(spec["c"] - spec["b"], spec["a"])
    elif kind == "quadratic_roots":
        expected_roots = sorted((Fraction(spec["root_1"]), Fraction(spec["root_2"])))
        received = sorted(_fraction(item) for item in payload["acceptable_answers"][0].split(";"))
        if received != expected_roots:
            raise TaskValidationError("quadratic roots do not match coefficients")
        return
    elif kind == "discriminant":
        expected = Fraction(spec["b"] ** 2 - 4 * spec["a"] * spec["c"])
    elif kind == "integer_power":
        expected = Fraction(spec["base"] ** spec["exponent"])
    elif kind == "arithmetic_mean":
        values = spec["values"]
        expected = Fraction(sum(values), len(values))
    elif kind == "concept_choice":
        if payload["acceptable_answers"][0] not in payload["options"]:
            raise TaskValidationError("concept answer must be one of the options")
        return
    else:
        raise TaskValidationError(f"unsupported validator kind: {kind}")
    if _fraction(payload["acceptable_answers"][0]) != expected:
        raise TaskValidationError(f"incorrect generated answer for {kind}")


def validate_generated_task(payload):
    if not isinstance(payload, dict):
        raise TaskValidationError("task must be an object")
    for field in ("prompt", "hint", "explanation"):
        _require_localized(payload.get(field), field)
    if payload.get("task_type") not in {"single_choice", "short_answer"}:
        raise TaskValidationError("unsupported task_type")
    if payload.get("difficulty") not in {1, 2, 3}:
        raise TaskValidationError("difficulty must be 1, 2 or 3")
    answers = payload.get("acceptable_answers")
    if not isinstance(answers, list) or not answers or any(
        not isinstance(answer, str) or not answer.strip() for answer in answers
    ):
        raise TaskValidationError("acceptable_answers must be a non-empty string list")
    options = payload.get("options")
    if not isinstance(options, list) or len(options) != len(set(options)):
        raise TaskValidationError("options must be a unique list")
    if payload["task_type"] == "single_choice" and (
        len(options) < 2 or not any(answer in options for answer in answers)
    ):
        raise TaskValidationError("single_choice requires options containing the answer")
    _validate_math(payload)
    return True
