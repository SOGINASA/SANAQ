"""Structured lesson guides shared by the web lesson and printable workbook.

The curriculum graph stores atomic skills, while this module turns them into a
predictable teaching sequence.  No LLM is used here: the same source data always
produces the same lesson and can therefore be reviewed by a methodologist.
"""

from models import Skill, Task, Topic, db
from utils.localization import localized


REFERENCE_FAMILIES = (
    (("power", "exponent", "standard-form"), "Степени сохраняют порядок действий: сначала преобразуйте основания и показатели, затем выполняйте арифметику.", "a^m · a^n = a^(m+n); (a^m)^n = a^(mn); a^0 = 1"),
    (("factor", "polynomial", "monomial", "algebraic-expression"), "Алгебраическое выражение упрощают только равносильными преобразованиями. Перед объединением проверьте, что слагаемые подобны.", "ab + ac = a(b + c); (a + b)^2 = a^2 + 2ab + b^2"),
    (("linear-equation", "equation-transform", "word-problem-equation"), "Равенство сохраняется, если выполнить одно и то же допустимое действие с обеими частями уравнения.", "ax + b = c  =>  x = (c - b) / a, a != 0"),
    (("system",), "Решение системы должно одновременно удовлетворять каждому её уравнению. После нахождения пары обязательно выполните проверку.", "Подстановка · сложение · графический способ"),
    (("quadratic", "vieta", "parabola"), "Для квадратной модели сначала приведите выражение к виду ax^2 + bx + c. Затем выберите дискриминант, разложение или свойства параболы.", "D = b^2 - 4ac; x = (-b ± sqrt(D)) / 2a"),
    (("inequal", "interval"), "При умножении или делении неравенства на отрицательное число знак меняется. Метод интервалов требует отметить все критические точки.", "f(x) > 0: критические точки -> интервалы -> знаки"),
    (("function", "graph"), "Функция связывает допустимое значение x с единственным значением y. График читают через область определения, нули, знак и характер изменения.", "y = f(x); нуль функции: f(x) = 0"),
    (("sequence", "series", "progression"), "Последовательность анализируют по номеру n и закону образования. Не смешивайте формулу n-го члена с формулой суммы.", "a_n = a_1 + (n-1)d; b_n = b_1 q^(n-1)"),
    (("trig", "sine", "cosine"), "Тригонометрическое выражение упрощают через базовые тождества, область допустимых значений и знаки функций по четвертям.", "sin^2(x) + cos^2(x) = 1; tan(x) = sin(x)/cos(x)"),
    (("root", "radical", "irrational"), "Квадратный корень обозначает неотрицательное число. Перед преобразованием проверьте область допустимых значений.", "sqrt(a^2) = |a|; sqrt(ab) = sqrt(a)sqrt(b), a,b >= 0"),
    (("rational",), "В дробно-рациональном выражении знаменатель не может быть равен нулю. Ограничения записывают до сокращения.", "A/B: B != 0; общий знаменатель -> преобразование -> проверка"),
    (("probability", "combinator", "permutation"), "Вероятностная модель начинается с множества исходов. Считайте только равновозможные исходы и не допускайте двойного подсчёта.", "P(A) = m/n; 0 <= P(A) <= 1"),
    (("statistics", "data", "mean", "variance", "frequency", "distribution", "inference"), "Статистический вывод должен опираться на корректно собранные данные. Среднее описывает центр, а разброс — устойчивость результата.", "mean = sum(x_i)/n; variance = sum((x_i-mean)^2)/n"),
    (("vector", "coordinate", "analytic-geometry"), "Координатный метод переводит геометрическую задачу в операции с компонентами. Следите за порядком координат и направлением вектора.", "AB = (x_B-x_A; y_B-y_A); |a| = sqrt(a_x^2+a_y^2)"),
    (("triangle", "angle", "parallel", "similarity", "pythagorean"), "Геометрическое решение начинается с чертежа и перечисления известных фактов. Каждый вывод должен опираться на определение или теорему.", "a^2 + b^2 = c^2; сумма углов треугольника = 180°"),
    (("circle", "polygon", "quadrilateral", "trapezoid", "area"), "Подпишите все размеры на чертеже, выберите фигуру и только затем применяйте формулу площади, длины или свойства углов.", "C = 2πr; S_circle = πr^2; S_triangle = ah/2"),
    (("stereometry", "polyhed", "volume", "plane", "space", "revolution"), "В пространственной задаче полезно отделить основание, высоту и сечение. Невидимые связи фиксируйте на схеме пунктиром.", "V_prism = S_base·h; V_pyramid = S_base·h/3"),
    (("derivative", "limit", "continuity", "optimization"), "Исследование функции выполняют по этапам: область определения, производная, критические точки, знаки и вывод на исходном языке задачи.", "f'(x) = lim(h->0) (f(x+h)-f(x))/h"),
    (("integral", "differential"), "Интеграл связывает скорость изменения и накопленную величину. После интегрирования проверяйте результат дифференцированием.", "∫ f(x)dx = F(x)+C, где F'(x)=f(x)"),
    (("log",), "Логарифм определён только при положительном аргументе и допустимом основании. ОДЗ проверяется до применения свойств.", "log_a(xy)=log_a(x)+log_a(y); a>0, a!=1, x>0"),
    (("complex",), "Комплексное число состоит из действительной и мнимой частей. Равенство возможно только при совпадении обеих частей.", "z = a + bi; i^2 = -1; |z| = sqrt(a^2+b^2)"),
)


DEFAULT_REFERENCE = (
    "Математический навык осваивается через точное условие, выбор правила, последовательное решение и обязательную проверку.",
    "Дано -> правило -> вычисления -> проверка -> ответ",
)

LOCALIZED_DEFAULT_REFERENCES = {
    "kk": (
        "Математикалық дағдыны меңгеру үшін шартты дәл оқып, ережені таңдап, шешімді қадамдап жазып, жауапты тексеру керек.",
        "Берілгені → ереже → есептеу → тексеру → жауап",
    ),
    "en": (
        "Master the skill by reading the condition precisely, choosing a rule, showing each step, and checking the answer.",
        "Given → rule → calculation → check → answer",
    ),
}


TEACHING_PACKS = (
    (("factor", "polynomial", "monomial", "algebraic-expression"), {
        "example": ("Разложите на множители: 6x² - 9x.", ["Находим общий множитель коэффициентов: 3.", "В обеих частях есть x, выносим 3x.", "Получаем 3x(2x - 3) и проверяем раскрытием скобок."], "3x(2x - 3)"),
        "practice": [("Разложите на множители: 8a² + 12a.", "4a(2a + 3)"), ("Примените разность квадратов: x² - 25.", "(x - 5)(x + 5)"), ("Представьте как квадрат двучлена: x² + 6x + 9.", "(x + 3)²"), ("Раскройте скобки и приведите подобные: 3(x+2)-2(x-4).", "x + 14"), ("Разложите группировкой: ax+ay+bx+by.", "(a+b)(x+y)"), ("Вынесите общий множитель: 15a²-10a.", "5a(3a-2)")],
    }),
    (("linear-equation", "equation-transform", "word-problem-equation"), {
        "example": ("Решите уравнение: 4x - 7 = 13.", ["Прибавляем 7 к обеим частям: 4x = 20.", "Делим обе части на 4: x = 5.", "Проверка: 4·5 - 7 = 13."], "x = 5"),
        "practice": [("Решите: 5x + 8 = 33.", "x = 5"), ("Решите: 3(x - 2) = 18.", "x = 8"), ("Составьте уравнение: после увеличения числа на 7 получилось 25.", "x + 7 = 25; x = 18"), ("Решите: 7x-9=4x+12.", "x = 7"), ("Решите: (x+3)/4=5.", "x = 17"), ("У Маши было x тенге. После покупки за 1200 тенге осталось 800. Найдите x.", "x-1200=800; x=2000")],
    }),
    (("system",), {
        "example": ("Решите систему: x + y = 7; x - y = 1.", ["Складываем уравнения: 2x = 8.", "Получаем x = 4 и подставляем в первое уравнение.", "y = 3; обе проверки верны."], "(4; 3)"),
        "practice": [("Решите подстановкой: y = 2x; x + y = 9.", "(3; 6)"), ("Решите сложением: 2x + y = 7; 2x - y = 1.", "(2; 3)"), ("Определите точку пересечения y = x + 1 и y = 5 - x.", "(2; 3)"), ("Решите систему: x+y=10; x-y=4.", "(7; 3)"), ("Решите систему: 3x+y=11; y=x-1.", "(3; 2)"), ("Проверьте, является ли (2;1) решением системы x+2y=4; 3x-y=5.", "Да")],
    }),
    (("quadratic", "vieta", "parabola"), {
        "example": ("Решите: x² - 5x + 6 = 0.", ["a=1, b=-5, c=6; D=25-24=1.", "x₁=(5-1)/2=2, x₂=(5+1)/2=3.", "Проверяем: (x-2)(x-3)=0."], "x = 2; 3"),
        "practice": [("Найдите дискриминант: 2x² - 3x - 2 = 0.", "D = 25"), ("Решите: x² + 2x - 8 = 0.", "x = 2; x = -4"), ("Найдите вершину параболы y = x² - 4x + 3.", "(2; -1)"), ("Разложите на множители: x²-7x+12.", "(x-3)(x-4)"), ("По теореме Виета найдите корни: x²-9x+20=0.", "x=4; x=5"), ("Определите направление ветвей y=-2x²+3x+1.", "Вниз")],
    }),
    (("power", "exponent", "standard-form"), {
        "example": ("Упростите: 2³·2⁴ / 2².", ["При умножении складываем показатели: 2⁷.", "При делении вычитаем показатель: 2⁵.", "2⁵ = 32."], "32"),
        "practice": [("Вычислите: 3²·3³.", "243"), ("Упростите: (a³)²/a⁴.", "a², a ≠ 0"), ("Представьте 0,00045 в стандартном виде.", "4,5·10⁻⁴"), ("Вычислите: 5⁰+2⁻¹.", "3/2"), ("Упростите: (2ab²)³.", "8a³b⁶"), ("Сравните: 2⁵ и 4².", "2⁵ > 4²")],
    }),
    (("root", "radical", "irrational"), {
        "example": ("Упростите: √50 - √8.", ["Раскладываем подкоренные числа: 50=25·2, 8=4·2.", "Извлекаем полные квадраты: 5√2 - 2√2.", "Объединяем подобные радикалы."], "3√2"),
        "practice": [("Вычислите: √81.", "9"), ("Упростите: √48.", "4√3"), ("Найдите ОДЗ: √(x-5).", "x ≥ 5"), ("Сложите подобные радикалы: 3√5+2√5.", "5√5"), ("Освободитесь от иррациональности: 6/√3.", "2√3"), ("Решите: √x=7.", "x = 49")],
    }),
    (("inequal", "interval"), {
        "example": ("Решите неравенство: (x-2)/(x+1) > 0.", ["Критические точки: -1 и 2; x=-1 исключается.", "Отмечаем интервалы (-∞;-1), (-1;2), (2;+∞).", "Проверка знаков даёт первый и третий интервалы."], "(-∞;-1) ∪ (2;+∞)"),
        "practice": [("Решите: 3x - 7 ≤ 5.", "x ≤ 4"), ("Решите: -2x+6>10.", "x < -2"), ("Решите методом интервалов: (x-4)(x+2) ≥ 0.", "(-∞; -2] ∪ [4; +∞)"), ("Решите двойное неравенство: 1<2x+3≤9.", "-1 < x ≤ 3"), ("Решите: x²-9<0.", "-3 < x < 3"), ("Изобразите на числовой прямой x≥-2.", "[-2; +∞)")],
    }),
    (("rational",), {
        "example": ("Упростите: (x²-9)/(x-3).", ["Записываем ОДЗ: x ≠ 3.", "Разлагаем числитель: (x-3)(x+3).", "Сокращаем допустимый множитель, сохраняя ОДЗ."], "x + 3, x ≠ 3"),
        "practice": [("Найдите ОДЗ: 5/(x+2).", "x ≠ -2"), ("Сократите: (a²-16)/(a-4).", "a + 4, a ≠ 4"), ("Сложите: 1/x + 2/x.", "3/x, x ≠ 0"), ("Приведите к общему знаменателю: 1/a+1/b.", "(a+b)/(ab), a≠0, b≠0"), ("Умножьте: (x/3)·(6/x²).", "2/x, x≠0"), ("Разделите: (a²/b):(a/b²).", "ab, a≠0, b≠0")],
    }),
    (("function", "graph"), {
        "example": ("Для y=2x-3 найдите y при x=4 и нуль функции.", ["Подставляем x=4: y=8-3=5.", "Для нуля приравниваем y к нулю: 2x-3=0.", "x=1,5."], "y(4)=5; x₀=1,5"),
        "practice": [("Постройте три точки графика y=-x+4.", "Например: (0;4), (2;2), (4;0)"), ("Найдите область определения y=1/(x-2).", "x ≠ 2"), ("Найдите нуль функции y=3x-12.", "x = 4"), ("Вычислите f(-2), если f(x)=x²+1.", "5"), ("Определите, принадлежит ли точка (3;7) графику y=2x+1.", "Да"), ("Найдите пересечение y=-2x+6 с осью Oy.", "(0;6)")],
    }),
    (("sequence", "series", "progression"), {
        "example": ("В арифметической прогрессии a₁=4, d=3. Найдите a₆.", ["Используем aₙ=a₁+(n-1)d.", "Подставляем n=6: a₆=4+5·3.", "Вычисляем и проверяем последовательным прибавлением 3."], "a₆ = 19"),
        "practice": [("Найдите a₁₀, если a₁=2, d=4.", "38"), ("Найдите b₅, если b₁=3, q=2.", "48"), ("Найдите сумму первых пяти членов: 2, 5, 8, ...", "40"), ("Найдите разность прогрессии: 11, 8, 5, ...", "d = -3"), ("Найдите знаменатель прогрессии: 2, 6, 18, ...", "q = 3"), ("Является ли 31 членом последовательности aₙ=1+5(n-1)?", "Да, n=7")],
    }),
    (("trig", "sine", "cosine"), {
        "example": ("Найдите sin α, если cos α=3/5 и α острый.", ["Используем sin²α+cos²α=1.", "sin²α=1-9/25=16/25.", "Для острого угла берём положительный корень."], "sin α = 4/5"),
        "practice": [("Упростите: sin²x + cos²x.", "1"), ("Найдите tan α, если sin α=3/5, cos α=4/5.", "3/4"), ("Решите на [0;2π]: sin x = 0.", "x = 0; π; 2π"), ("Вычислите: sin 30°+cos 60°.", "1"), ("Найдите cos α, если sin α=12/13 и α острый.", "5/13"), ("Упростите: (1-cos²x)/sin x.", "sin x, sin x≠0")],
    }),
    (("probability", "combinator", "permutation", "random-variable"), {
        "example": ("Кубик бросают один раз. Найдите вероятность числа больше 4.", ["Всего шесть равновозможных исходов.", "Подходят 5 и 6: два исхода.", "Делим число благоприятных исходов на общее число."], "2/6 = 1/3"),
        "practice": [("Монету бросают дважды. Найдите вероятность двух орлов.", "1/4"), ("Найдите вероятность чётного числа на кубике.", "1/2"), ("Сколькими способами можно выбрать 2 учеников из 4?", "6"), ("Из мешка с 3 красными и 2 синими шарами достают один. Найдите P(синий).", "2/5"), ("Найдите число перестановок трёх разных книг.", "6"), ("Найдите вероятность суммы 7 при броске двух кубиков.", "1/6")],
    }),
    (("statistics", "data", "mean", "variance", "frequency", "distribution", "inference"), {
        "example": ("Найдите среднее набора 4, 6, 6, 8.", ["Сумма значений равна 24.", "Количество значений равно 4.", "Делим 24 на 4."], "6"),
        "practice": [("Найдите среднее: 3, 5, 7, 9.", "6"), ("Найдите медиану: 2, 4, 5, 8, 11.", "5"), ("Составьте таблицу частот для 2, 2, 3, 4, 4, 4.", "2 → 2 раза; 3 → 1 раз; 4 → 3 раза"), ("Найдите размах: 12, 7, 19, 10.", "12"), ("Найдите моду: 1, 2, 2, 3, 3, 3, 4.", "3"), ("Найдите среднее для значений 5, 5, 8, 10.", "7")],
    }),
    (("vector", "coordinate", "analytic-geometry"), {
        "example": ("Найдите вектор AB для A(1;2), B(5;-1).", ["Вычитаем координаты начала из координат конца.", "AB=(5-1; -1-2).", "Получаем (4;-3), длина равна 5."], "AB=(4;-3), |AB|=5"),
        "practice": [("Найдите расстояние между A(0;0) и B(6;8).", "10"), ("Сложите векторы (2;-1) и (3;4).", "(5; 3)"), ("Найдите середину отрезка с концами (-2;3) и (4;7).", "(1; 5)"), ("Найдите вектор AB: A(-1;4), B(3;2).", "(4;-2)"), ("Умножьте вектор (2;-3) на -2.", "(-4;6)"), ("Проверьте перпендикулярность векторов (1;2) и (4;-2).", "Перпендикулярны: скалярное произведение равно 0")],
    }),
    (("geometry", "triangle", "angle", "parallel", "similarity", "pythagorean", "circle", "polygon", "quadrilateral", "trapezoid", "area"), {
        "example": ("Катеты прямоугольного треугольника равны 6 и 8. Найдите гипотенузу.", ["По теореме Пифагора c²=6²+8².", "c²=36+64=100.", "Длина положительна, поэтому c=10."], "10"),
        "practice": [("Найдите третий угол треугольника, если два угла 45° и 65°.", "70°"), ("Найдите площадь треугольника с основанием 10 и высотой 7.", "35"), ("Найдите длину окружности радиуса 4.", "8π"), ("Найдите гипотенузу при катетах 5 и 12.", "13"), ("Найдите площадь круга радиуса 3.", "9π"), ("В равнобедренном треугольнике угол при вершине 40°. Найдите угол при основании.", "70°")],
    }),
    (("stereometry", "polyhed", "volume", "plane", "space", "revolution"), {
        "example": ("Найдите объём прямой призмы: S основания=12, h=5.", ["Используем V=Sосн·h.", "Подставляем значения: V=12·5.", "Записываем кубические единицы."], "60"),
        "practice": [("Найдите объём цилиндра радиуса 3 и высотой 4.", "36π"), ("Найдите объём пирамиды: Sосн=18, h=5.", "30"), ("Найдите объём куба с ребром 4.", "64"), ("Найдите площадь поверхности куба с ребром 3.", "54"), ("Найдите объём конуса радиуса 3 и высотой 5.", "15π"), ("Сколько граней, рёбер и вершин у прямоугольного параллелепипеда?", "6 граней, 12 рёбер, 8 вершин")],
    }),
    (("derivative", "limit", "continuity", "optimization"), {
        "example": ("Найдите производную f(x)=3x²-4x+1.", ["(3x²)'=6x.", "(-4x)'=-4, производная константы равна 0.", "Собираем результат и при необходимости проверяем."], "f'(x)=6x-4"),
        "practice": [("Найдите производную x³-5x.", "3x² - 5"), ("Найдите критическую точку f(x)=x²-6x+5.", "x = 3"), ("Найдите f'(2), если f(x)=x²+3x.", "7"), ("Найдите производную sin x + 4x.", "cos x + 4"), ("Определите промежутки возрастания f(x)=x².", "(0; +∞)"), ("Найдите максимум функции -x²+4x на R.", "4 при x=2")],
    }),
    (("integral", "differential"), {
        "example": ("Вычислите ∫(3x²-2)dx.", ["Интегрируем слагаемые отдельно.", "∫3x²dx=x³, а ∫(-2)dx=-2x.", "Добавляем произвольную постоянную и проверяем производной."], "x³ - 2x + C"),
        "practice": [("Вычислите ∫4x³dx.", "x⁴ + C"), ("Вычислите ∫(2x+3)dx.", "x² + 3x + C"), ("Найдите ∫₀² x dx.", "2"), ("Вычислите ∫cos x dx.", "sin x + C"), ("Найдите первообразную для 6x²-4.", "2x³-4x+C"), ("Найдите площадь под y=3 на отрезке [1;5].", "12")],
    }),
    (("log",), {
        "example": ("Решите log₂x=3.", ["Переходим к показательной форме.", "x=2³.", "x=8 удовлетворяет ОДЗ x>0."], "8"),
        "practice": [("Вычислите log₃27.", "3"), ("Решите: 2ˣ=16.", "x = 4"), ("Вычислите log₂8+log₂4.", "5"), ("Решите log₅x=2.", "x = 25"), ("Упростите logₐ(a³), a>0, a≠1.", "3"), ("Найдите ОДЗ: log₂(x-7).", "x > 7")],
    }),
    (("complex",), {
        "example": ("Сложите: (3+2i)+(1-5i).", ["Складываем действительные части: 3+1=4.", "Складываем мнимые части: 2i-5i=-3i.", "Записываем результат в виде a+bi."], "4 - 3i"),
        "practice": [("Вычислите: i².", "-1"), ("Умножьте: (2+i)(2-i).", "5"), ("Найдите |3+4i|.", "5"), ("Сложите: (1+3i)+(4-2i).", "5+i"), ("Вычтите: (5+i)-(2-4i).", "3+5i"), ("Найдите сопряжённое к z=-2+7i.", "-2-7i")],
    }),
)


def _teaching_pack(topic_id):
    lowered = topic_id.lower()
    return next((pack for tokens, pack in TEACHING_PACKS if any(token in lowered for token in tokens)), None)


def authored_practice_for_topic(topic_id):
    """Return reviewed prompt/answer pairs for a curriculum topic."""
    pack = _teaching_pack(topic_id)
    return list(pack["practice"]) if pack else []


FRAME = {
    "ru": {
        "intro": "В этом уроке мы связываем правило с практикой и учимся объяснять каждый шаг решения.",
        "meaning": "Что важно понять",
        "algorithm": "Алгоритм решения",
        "mistakes": "Типичные ошибки",
        "steps": [
            "Перепишите условие и выделите, что известно и что требуется найти.",
            "Назовите правило или формулу до начала вычислений.",
            "Выполняйте по одному преобразованию в строке.",
            "Проверьте ограничения, знак, единицы и подстановку ответа.",
        ],
        "mistake_items": [
            "Начинать вычисления, не определив математическую модель.",
            "Пропускать промежуточные преобразования и терять знак.",
            "Записывать ответ без проверки и пояснения.",
        ],
        "objective": "Научиться: {skill}.",
        "example_title": "Разобранный пример {number}",
        "example_steps": ["Определяем тип задачи.", "Применяем подходящее правило.", "Проверяем результат."],
        "challenge": "Составьте собственный пример на навык «{skill}» и решите его с полной проверкой.",
        "reflection": "Объясните одним предложением, почему выбранный способ решения работает.",
    },
    "kk": {
        "intro": "Бұл сабақта ережені тәжірибемен байланыстырып, шешімнің әр қадамын түсіндіруді үйренеміз.",
        "meaning": "Нені түсіну маңызды",
        "algorithm": "Шешу алгоритмі",
        "mistakes": "Жиі кездесетін қателер",
        "steps": [
            "Шартты қайта жазып, берілгені мен табу керегін белгілеңіз.",
            "Есептеуді бастамас бұрын ережені немесе формуланы атаңыз.",
            "Әр жолда бір түрлендіру орындаңыз.",
            "Шектеулерді, таңбаны, өлшем бірліктерін және жауапты тексеріңіз.",
        ],
        "mistake_items": [
            "Математикалық модельді анықтамай есептеуді бастау.",
            "Аралық түрлендірулерді өткізіп, таңбаны жоғалту.",
            "Жауапты тексерусіз және түсіндірмесіз жазу.",
        ],
        "objective": "Үйрену: {skill}.",
        "example_title": "Талданған мысал {number}",
        "example_steps": ["Есеп түрін анықтаймыз.", "Сәйкес ережені қолданамыз.", "Нәтижені тексереміз."],
        "challenge": "«{skill}» дағдысына өз мысалыңызды құрып, толық тексерумен шешіңіз.",
        "reflection": "Таңдалған шешу тәсілі неліктен жұмыс істейтінін бір сөйлеммен түсіндіріңіз.",
    },
    "en": {
        "intro": "This lesson connects a rule to practice and trains you to explain every step.",
        "meaning": "What matters",
        "algorithm": "Solution algorithm",
        "mistakes": "Common mistakes",
        "steps": ["Rewrite the problem and identify knowns and unknowns.", "Name the rule before calculating.", "Make one transformation per line.", "Check restrictions, signs, units, and substitution."],
        "mistake_items": ["Calculating before choosing a model.", "Skipping steps and losing a sign.", "Giving an unchecked answer without explanation."],
        "objective": "Learn to: {skill}.",
        "example_title": "Worked example {number}",
        "example_steps": ["Identify the task type.", "Apply the relevant rule.", "Verify the result."],
        "challenge": "Create your own example for “{skill}” and solve it with a complete check.",
        "reflection": "Explain in one sentence why the selected solution method works.",
    },
}


def _reference_for(topic_id):
    lowered = topic_id.lower()
    for tokens, principle, formula in REFERENCE_FAMILIES:
        if any(token in lowered for token in tokens):
            return principle, formula
    return DEFAULT_REFERENCE


def build_lesson_guide(module, lesson, tasks=None, locale=None):
    """Return a stable, web/PDF-ready teaching structure for one lesson."""
    locale = locale if locale in FRAME else "ru"
    copy = FRAME[locale]
    topic = db.session.get(Topic, module.topic_id)
    tasks = tasks if tasks is not None else db.session.scalars(
        db.select(Task).where(Task.lesson_id == lesson.id, Task.is_published.is_(True)).order_by(Task.difficulty, Task.id)
    ).all()
    skill_ids = list(dict.fromkeys(task.skill_id for task in tasks))
    skills = [db.session.get(Skill, skill_id) for skill_id in skill_ids]
    skills = [skill for skill in skills if skill]
    principle, formula = _reference_for(topic.id if topic else module.topic_id)
    if locale in LOCALIZED_DEFAULT_REFERENCES:
        principle, formula = LOCALIZED_DEFAULT_REFERENCES[locale]
    teaching_pack = _teaching_pack(topic.id if topic else module.topic_id)

    objectives = [copy["objective"].format(skill=localized(skill.name, locale)) for skill in skills]
    if not objectives:
        objectives = [copy["objective"].format(skill=localized(lesson.title, locale))]

    examples = []
    if teaching_pack and locale == "ru":
        problem, steps, answer = teaching_pack["example"]
        examples.append({"title": copy["example_title"].format(number=1), "problem": problem, "steps": steps, "answer": answer})
    for index, task in enumerate(tasks[:max(0, 3 - len(examples))], start=len(examples) + 1):
        examples.append({
            "title": copy["example_title"].format(number=index),
            "problem": localized(task.prompt, locale),
            "steps": [*copy["example_steps"], localized(task.explanation, locale)],
            "answer": (task.acceptable_answers or [""])[0],
        })

    practice = []
    if teaching_pack and locale == "ru":
        practice.extend({"number": index, "task_id": None, "prompt": prompt, "difficulty": index, "answer": answer, "hint": copy["steps"][(index - 1) % len(copy["steps"])]} for index, (prompt, answer) in enumerate(teaching_pack["practice"], 1))
    practice.extend({
        "number": index,
        "task_id": task.id,
        "prompt": localized(task.prompt, locale),
        "difficulty": task.difficulty,
        "answer": "; ".join(map(str, task.acceptable_answers or [])),
        "hint": localized(task.hint, locale),
    } for index, task in enumerate(tasks, start=len(practice) + 1))
    for skill in skills:
        practice.append({
            "number": len(practice) + 1,
            "task_id": None,
            "prompt": copy["challenge"].format(skill=localized(skill.name, locale)),
            "difficulty": 3,
            "answer": copy["reflection"],
            "hint": copy["steps"][0],
        })

    return {
        "version": "lesson-guide-v1",
        "grade": module.grade,
        "subject": "Математика" if locale == "ru" else "Математика" if locale == "kk" else "Mathematics",
        "topic": localized(topic.name, locale) if topic else localized(module.title, locale),
        "title": localized(lesson.title, locale),
        "intro": copy["intro"],
        "objectives": objectives,
        "sections": [
            {"kind": "concept", "title": copy["meaning"], "body": localized(lesson.theory, locale), "callout": principle},
            {"kind": "formula", "title": copy["algorithm"], "body": formula, "items": copy["steps"]},
            {"kind": "warning", "title": copy["mistakes"], "items": copy["mistake_items"]},
        ],
        "examples": examples,
        "practice": practice,
        "reflection": copy["reflection"],
        "estimated_minutes": 45,
        "workbook": {
            "available": True,
            "pages": 5,
            "format": "A4 PDF",
            "download_url": f"/lessons/{lesson.id}/workbook.pdf",
        },
    }
