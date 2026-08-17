import random
from fractions import Fraction

from services.task_generation.validators import validate_generated_task


def _number(value):
    value = Fraction(value)
    return str(value.numerator) if value.denominator == 1 else f"{value.numerator}/{value.denominator}"


def _linear_equation(rng, difficulty):
    solution = rng.randint(-6 * difficulty, 8 * difficulty)
    a = rng.choice([item for item in range(-5, 6) if item not in {0}])
    b = rng.randint(-10 * difficulty, 10 * difficulty)
    c = a * solution + b
    answer = _number(Fraction(c - b, a))
    return {
        "prompt": {"ru": f"Решите уравнение: {a}x + {b} = {c}", "kk": f"Теңдеуді шешіңіз: {a}x + {b} = {c}"},
        "task_type": "short_answer", "difficulty": difficulty, "options": [],
        "acceptable_answers": [answer],
        "hint": {"ru": "Перенесите свободный член и разделите обе части на коэффициент при x.", "kk": "Бос мүшені көшіріп, екі бөлікті x коэффициентіне бөліңіз."},
        "explanation": {"ru": f"{a}x = {c - b}, поэтому x = {answer}.", "kk": f"{a}x = {c - b}, сондықтан x = {answer}."},
        "validator_payload": {"kind": "linear_equation", "a": a, "b": b, "c": c},
    }


def _quadratic(rng, difficulty, discriminant=False):
    root_1 = rng.randint(-4 * difficulty, 5 * difficulty)
    root_2 = rng.randint(-4 * difficulty, 5 * difficulty)
    b = -(root_1 + root_2)
    c = root_1 * root_2
    if discriminant:
        answer = str(b * b - 4 * c)
        prompt_ru = f"Найдите дискриминант: x² + ({b})x + ({c}) = 0"
        prompt_kk = f"Дискриминантты табыңыз: x² + ({b})x + ({c}) = 0"
        spec = {"kind": "discriminant", "a": 1, "b": b, "c": c}
    else:
        answer = ";".join(map(str, sorted((root_1, root_2))))
        prompt_ru = f"Найдите корни: x² + ({b})x + ({c}) = 0. Запишите через ;"
        prompt_kk = f"Түбірлерін табыңыз: x² + ({b})x + ({c}) = 0. ; арқылы жазыңыз"
        spec = {"kind": "quadratic_roots", "root_1": root_1, "root_2": root_2}
    return {
        "prompt": {"ru": prompt_ru, "kk": prompt_kk}, "task_type": "short_answer",
        "difficulty": difficulty, "options": [], "acceptable_answers": [answer],
        "hint": {"ru": "Используйте дискриминант или разложение на множители.", "kk": "Дискриминантты немесе көбейткіштерге жіктеуді қолданыңыз."},
        "explanation": {"ru": f"Коэффициенты построены по корням {root_1} и {root_2}.", "kk": f"Коэффициенттер {root_1} және {root_2} түбірлері бойынша құрылды."},
        "validator_payload": spec,
    }


def _power(rng, difficulty):
    base = rng.randint(2, 3 + difficulty)
    exponent = rng.randint(2, 2 + difficulty)
    answer = str(base ** exponent)
    return {
        "prompt": {"ru": f"Вычислите {base}^{exponent}", "kk": f"{base}^{exponent} мәнін есептеңіз"},
        "task_type": "short_answer", "difficulty": difficulty, "options": [],
        "acceptable_answers": [answer],
        "hint": {"ru": "Умножьте основание само на себя нужное число раз.", "kk": "Негізді өзіне қажетті рет көбейтіңіз."},
        "explanation": {"ru": f"Ответ: {answer}.", "kk": f"Жауабы: {answer}."},
        "validator_payload": {"kind": "integer_power", "base": base, "exponent": exponent},
    }


def _mean(rng, difficulty):
    values = [rng.randint(1, 10 * difficulty) for _ in range(3 + difficulty)]
    answer = _number(Fraction(sum(values), len(values)))
    joined = ", ".join(map(str, values))
    return {
        "prompt": {"ru": f"Найдите среднее арифметическое: {joined}", "kk": f"Арифметикалық ортаны табыңыз: {joined}"},
        "task_type": "short_answer", "difficulty": difficulty, "options": [],
        "acceptable_answers": [answer],
        "hint": {"ru": "Сложите значения и разделите на их количество.", "kk": "Мәндерді қосып, олардың санына бөліңіз."},
        "explanation": {"ru": f"Сумма {sum(values)}, количество {len(values)}, ответ {answer}.", "kk": f"Қосындысы {sum(values)}, саны {len(values)}, жауабы {answer}."},
        "validator_payload": {"kind": "arithmetic_mean", "values": values},
    }


def _concept(skill, distractors, difficulty):
    correct = skill["name"]["ru"]
    fallback = [
        {"name": {"ru": "Только переписать условие"}},
        {"name": {"ru": "Угадать ответ без решения"}},
        {"name": {"ru": "Пропустить проверку результата"}},
    ]
    options = [correct] + [
        item["name"]["ru"] for item in (distractors or fallback)[:3]
        if item["name"]["ru"] != correct
    ]
    return {
        "prompt": {"ru": "Какой навык соответствует текущей учебной цели?", "kk": "Қай дағды ағымдағы оқу мақсатына сәйкес келеді?"},
        "task_type": "single_choice", "difficulty": difficulty, "options": options,
        "acceptable_answers": [correct],
        "hint": {"ru": "Сопоставьте формулировку с названием изучаемого навыка.", "kk": "Тұжырымды оқылатын дағды атауымен салыстырыңыз."},
        "explanation": {"ru": f"Тек «{correct}» соответствует выбранному навыку.", "kk": f"Таңдалған дағдыға «{skill['name']['kk']}» сәйкес келеді."},
        "validator_payload": {"kind": "concept_choice"},
    }


def generate_task(skill, difficulty=1, seed=0, distractors=None):
    if difficulty not in {1, 2, 3}:
        raise ValueError("difficulty must be 1, 2 or 3")
    rng = random.Random(f"{seed}:{skill['id']}:{difficulty}")
    skill_id = skill["id"]
    if "discriminant" in skill_id:
        payload = _quadratic(rng, difficulty, discriminant=True)
    elif any(token in skill_id for token in ("quadratic-equation", "quadratic-roots", "vieta")):
        payload = _quadratic(rng, difficulty)
    elif skill_id.startswith("math-g7-") and "equation" in skill_id:
        payload = _linear_equation(rng, difficulty)
    elif "power" in skill_id or "exponent" in skill_id:
        payload = _power(rng, difficulty)
    elif any(token in skill_id for token in ("mean", "statistics", "data")):
        payload = _mean(rng, difficulty)
    else:
        payload = _concept(skill, distractors or [], difficulty)
    payload.update({"skill_id": skill_id, "generator_version": "taskgen-v1", "seed": seed})
    validate_generated_task(payload)
    return payload
