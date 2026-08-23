"""Stable demo content for the SANAQ mathematics vertical slice.

The seed deliberately contains both a clean student account for the complete
onboarding flow and several populated classmates for teacher/admin analytics.
All records use stable identifiers so the command remains safe to rerun.
"""

from datetime import datetime, timedelta, timezone

from models import (
    AIReport,
    Assignment,
    Attempt,
    AuditLog,
    ClassAnnouncement,
    ClassEnrollment,
    Classroom,
    DiagnosticQuestion,
    KnowledgeState,
    LearningModule,
    Lesson,
    Notification,
    PrerequisiteEdge,
    Skill,
    StudentProfile,
    Subject,
    Task,
    TeacherComment,
    TeacherProfile,
    Topic,
    User,
    db,
)
from services.curriculum import seed_math_curriculum


def _upsert(model, identity, **values):
    instance = db.session.get(model, identity)
    if instance is None:
        instance = model(id=identity)
        db.session.add(instance)
    for key, value in values.items():
        setattr(instance, key, value)
    return instance


def _demo_user(identity, email, name, role):
    user = db.session.get(User, identity)
    if user is None:
        user = db.session.scalar(db.select(User).where(User.email == email))
    if user is None:
        user = User(id=identity, email=email, name=name, role=role)
        db.session.add(user)
    user.email = email
    user.name = name
    user.role = role
    user.locale = "ru"
    user.region = "Алматы"
    user.timezone = "Asia/Almaty"
    user.is_active = True
    user.is_verified = True
    user.parental_consent_required = role == "student"
    user.parental_consent_status = "approved" if role == "student" else "not_required"
    user.set_password("SanaqDemo2026!")
    return user


def _add_en(value, text):
    """Return a localized JSON value with an explicit English variant."""
    return {**value, "en": text}


def seed_demo_data():
    seed_math_curriculum(commit=False)
    _upsert(
        Subject,
        "mathematics",
        name={"ru": "Математика", "kk": "Математика", "en": "Mathematics"},
        grades=[7, 8, 9, 10, 11, 12],
    )

    topics = [
        ("factoring", {"ru": "Разложение на множители", "kk": "Көбейткіштерге жіктеу"}, 1),
        ("quadratic-equations", {"ru": "Квадратные уравнения", "kk": "Квадрат теңдеулер"}, 2),
        ("quadratic-functions", {"ru": "Квадратичная функция", "kk": "Квадраттық функция"}, 3),
    ]
    topic_en = {
        "factoring": "Factoring",
        "quadratic-equations": "Quadratic equations",
        "quadratic-functions": "Quadratic functions",
    }
    for topic_id, name, order_index in topics:
        _upsert(
            Topic,
            topic_id,
            subject_id="mathematics",
            name=_add_en(name, topic_en[topic_id]),
            grade=9,
            order_index=order_index,
        )

    skills = [
        ("common-factor", "factoring", {"ru": "Вынесение общего множителя", "kk": "Ортақ көбейткішті шығару"}, 1),
        ("grouping", "factoring", {"ru": "Группировка выражений", "kk": "Өрнектерді топтау"}, 2),
        ("discriminant", "quadratic-equations", {"ru": "Дискриминант", "kk": "Дискриминант"}, 3),
        ("quadratic-roots", "quadratic-equations", {"ru": "Корни квадратного уравнения", "kk": "Квадрат теңдеудің түбірлері"}, 4),
        ("parabola", "quadratic-functions", {"ru": "График параболы", "kk": "Парабола графигі"}, 5),
        ("vertex", "quadratic-functions", {"ru": "Вершина параболы", "kk": "Параболаның төбесі"}, 6),
    ]
    skill_en = {
        "common-factor": "Factoring out the greatest common factor",
        "grouping": "Factoring by grouping",
        "discriminant": "Discriminant",
        "quadratic-roots": "Roots of a quadratic equation",
        "parabola": "Parabola graph",
        "vertex": "Vertex of a parabola",
    }
    for skill_id, topic_id, name, order_index in skills:
        _upsert(Skill, skill_id, topic_id=topic_id, name=_add_en(name, skill_en[skill_id]), order_index=order_index)

    edges = [
        ("grouping", "common-factor"),
        ("discriminant", "common-factor"),
        ("quadratic-roots", "discriminant"),
        ("parabola", "quadratic-roots"),
        ("vertex", "parabola"),
    ]
    for skill_id, prerequisite_id in edges:
        if db.session.get(PrerequisiteEdge, (skill_id, prerequisite_id)) is None:
            db.session.add(PrerequisiteEdge(
                skill_id=skill_id,
                prerequisite_skill_id=prerequisite_id,
            ))

    module_rows = [
        (
            "module-factoring", "factoring",
            {"ru": "Разложение на множители", "kk": "Көбейткіштерге жіктеу"},
            {"ru": "Общий множитель и группировка", "kk": "Ортақ көбейткіш және топтау"},
        ),
        (
            "module-quadratic-equations", "quadratic-equations",
            {"ru": "Квадратные уравнения", "kk": "Квадрат теңдеулер"},
            {"ru": "Дискриминант и поиск корней", "kk": "Дискриминант және түбірлерді табу"},
        ),
        (
            "module-quadratic-functions", "quadratic-functions",
            {"ru": "Квадратичная функция", "kk": "Квадраттық функция"},
            {"ru": "Парабола и её вершина", "kk": "Парабола және оның төбесі"},
        ),
    ]
    module_en = {
        "module-factoring": ("Factoring", "Greatest common factor and grouping"),
        "module-quadratic-equations": ("Quadratic equations", "Discriminant and finding roots"),
        "module-quadratic-functions": ("Quadratic functions", "A parabola and its vertex"),
    }
    for module_id, topic_id, title, description in module_rows:
        _upsert(
            LearningModule,
            module_id,
            subject_id="mathematics",
            topic_id=topic_id,
            title=_add_en(title, module_en[module_id][0]),
            description=_add_en(description, module_en[module_id][1]),
            grade=9,
            status="published",
            version=1,
        )

    lessons = [
        (
            "lesson-factoring", "module-factoring",
            {"ru": "Как увидеть общий множитель", "kk": "Ортақ көбейткішті қалай көруге болады"},
            {"ru": "Найдите часть, которая повторяется в каждом слагаемом, и вынесите её за скобки.", "kk": "Әр қосылғышта қайталанатын бөлікті тауып, оны жақша сыртына шығарыңыз."},
            {"ru": "6x + 12 = 6(x + 2)", "kk": "6x + 12 = 6(x + 2)"},
        ),
        (
            "lesson-quadratic-equations", "module-quadratic-equations",
            {"ru": "От дискриминанта к корням", "kk": "Дискриминанттан түбірлерге"},
            {"ru": "Для ax²+bx+c=0 вычислите D=b²−4ac. Знак D показывает число действительных корней.", "kk": "ax²+bx+c=0 үшін D=b²−4ac есептеңіз. D таңбасы нақты түбірлер санын көрсетеді."},
            {"ru": "x²−5x+6=0: D=1, корни 2 и 3.", "kk": "x²−5x+6=0: D=1, түбірлері 2 және 3."},
        ),
        (
            "lesson-quadratic-functions", "module-quadratic-functions",
            {"ru": "Читаем параболу", "kk": "Параболаны оқу"},
            {"ru": "В форме y=a(x−h)²+k вершина параболы находится в точке (h, k).", "kk": "y=a(x−h)²+k түрінде параболаның төбесі (h, k) нүктесінде орналасады."},
            {"ru": "y=(x−2)²+3 имеет вершину (2, 3).", "kk": "y=(x−2)²+3 функциясының төбесі (2, 3)."},
        ),
    ]
    lesson_en = {
        "lesson-factoring": (
            "How to spot a common factor",
            "Find the part repeated in every term, then move it outside the parentheses.",
            "6x + 12 = 6(x + 2)",
        ),
        "lesson-quadratic-equations": (
            "From the discriminant to the roots",
            "For ax²+bx+c=0, calculate D=b²−4ac. The sign of D tells you how many real roots there are.",
            "x²−5x+6=0: D=1, so the roots are 2 and 3.",
        ),
        "lesson-quadratic-functions": (
            "Reading a parabola",
            "In the form y=a(x−h)²+k, the vertex of the parabola is the point (h, k).",
            "The graph of y=(x−2)²+3 has its vertex at (2, 3).",
        ),
    }
    for index, (lesson_id, module_id, title, theory, example) in enumerate(lessons, 1):
        en_title, en_theory, en_example = lesson_en[lesson_id]
        _upsert(
            Lesson,
            lesson_id,
            module_id=module_id,
            title=_add_en(title, en_title),
            theory=_add_en(theory, en_theory),
            example=_add_en(example, en_example),
            order_index=index,
        )

    tasks = [
        (
            "task-common-factor", "lesson-factoring", "common-factor", 1,
            {"ru": "Разложите 6x + 12 на множители.", "kk": "6x + 12 өрнегін көбейткіштерге жіктеңіз."},
            ["6(x+2)", "3(2x+4)", "2(3x+6)"], ["6(x+2)"],
            {"ru": "Найдите наибольший общий множитель 6 и 12.", "kk": "6 және 12 сандарының ең үлкен ортақ көбейткішін табыңыз."},
            {"ru": "Оба слагаемых делятся на 6: 6x + 12 = 6(x + 2).", "kk": "Екі қосылғыш та 6-ға бөлінеді: 6x + 12 = 6(x + 2)."},
        ),
        (
            "task-grouping", "lesson-factoring", "grouping", 2,
            {"ru": "Разложите x² + 5x + 6 на множители.", "kk": "x² + 5x + 6 өрнегін көбейткіштерге жіктеңіз."},
            ["(x+2)(x+3)", "(x+1)(x+6)", "(x-2)(x-3)"], ["(x+2)(x+3)", "(x+3)(x+2)"],
            {"ru": "Нужны два числа с суммой 5 и произведением 6.", "kk": "Қосындысы 5, көбейтіндісі 6 болатын екі санды табыңыз."},
            {"ru": "Числа 2 и 3 дают сумму 5 и произведение 6, поэтому ответ (x+2)(x+3).", "kk": "2 және 3 сандарының қосындысы 5, көбейтіндісі 6, сондықтан жауап (x+2)(x+3)."},
        ),
        (
            "task-discriminant", "lesson-quadratic-equations", "discriminant", 2,
            {"ru": "Найдите дискриминант уравнения x² − 5x + 6 = 0.", "kk": "x² − 5x + 6 = 0 теңдеуінің дискриминантын табыңыз."},
            ["1", "5", "25"], ["1"],
            {"ru": "Используйте D=b²−4ac, где a=1, b=−5, c=6.", "kk": "a=1, b=−5, c=6 үшін D=b²−4ac формуласын қолданыңыз."},
            {"ru": "D=(−5)²−4·1·6=25−24=1.", "kk": "D=(−5)²−4·1·6=25−24=1."},
        ),
        (
            "task-quadratic-roots", "lesson-quadratic-equations", "quadratic-roots", 2,
            {"ru": "Укажите корни x² − 5x + 6 = 0 через запятую.", "kk": "x² − 5x + 6 = 0 теңдеуінің түбірлерін үтір арқылы жазыңыз."},
            [], ["2,3", "3,2"],
            {"ru": "Какие два числа дают сумму 5 и произведение 6?", "kk": "Қосындысы 5, көбейтіндісі 6 болатын екі сан қандай?"},
            {"ru": "Уравнение раскладывается как (x−2)(x−3)=0, поэтому корни 2 и 3.", "kk": "Теңдеу (x−2)(x−3)=0 түріне жіктеледі, сондықтан түбірлері 2 және 3."},
        ),
        (
            "task-parabola", "lesson-quadratic-functions", "parabola", 2,
            {"ru": "Куда направлены ветви параболы y=2x²?", "kk": "y=2x² параболасының тармақтары қайда бағытталған?"},
            ["Вверх", "Вниз"], ["вверх", "up"],
            {"ru": "Посмотрите на знак коэффициента перед x².", "kk": "x² алдындағы коэффициенттің таңбасына қараңыз."},
            {"ru": "Коэффициент 2 положительный, поэтому ветви направлены вверх.", "kk": "2 коэффициенті оң, сондықтан тармақтары жоғары бағытталған."},
        ),
        (
            "task-vertex", "lesson-quadratic-functions", "vertex", 3,
            {"ru": "Укажите вершину y=(x−2)²+3 в формате x,y.", "kk": "y=(x−2)²+3 функциясының төбесін x,y форматында жазыңыз."},
            [], ["2,3"],
            {"ru": "Сравните с формой y=(x−h)²+k.", "kk": "y=(x−h)²+k түрімен салыстырыңыз."},
            {"ru": "Здесь h=2 и k=3, значит вершина — (2, 3).", "kk": "Мұнда h=2 және k=3, демек төбесі — (2, 3)."},
        ),
    ]
    task_en = {
        "task-common-factor": (
            "Factor 6x + 12.",
            "Find the greatest common factor of 6 and 12.",
            "Both terms are divisible by 6: 6x + 12 = 6(x + 2).",
        ),
        "task-grouping": (
            "Factor x² + 5x + 6.",
            "Find two numbers whose sum is 5 and whose product is 6.",
            "The numbers 2 and 3 have a sum of 5 and a product of 6, so the answer is (x+2)(x+3).",
        ),
        "task-discriminant": (
            "Find the discriminant of x² − 5x + 6 = 0.",
            "Use D=b²−4ac with a=1, b=−5, and c=6.",
            "D=(−5)²−4·1·6=25−24=1.",
        ),
        "task-quadratic-roots": (
            "Enter the roots of x² − 5x + 6 = 0, separated by a comma.",
            "Which two numbers have a sum of 5 and a product of 6?",
            "The equation factors as (x−2)(x−3)=0, so its roots are 2 and 3.",
        ),
        "task-parabola": (
            "Which way does the parabola y=2x² open?",
            "Look at the sign of the coefficient of x².",
            "The coefficient 2 is positive, so the parabola opens upward.",
        ),
        "task-vertex": (
            "Enter the vertex of y=(x−2)²+3 in x,y format.",
            "Compare the function with y=(x−h)²+k.",
            "Here h=2 and k=3, so the vertex is (2, 3).",
        ),
    }
    for task_id, lesson_id, skill_id, difficulty, prompt, options, answers, hint, explanation in tasks:
        en_prompt, en_hint, en_explanation = task_en[task_id]
        _upsert(
            Task,
            task_id,
            lesson_id=lesson_id,
            skill_id=skill_id,
            prompt=_add_en(prompt, en_prompt),
            task_type="single_choice" if options else "short_answer",
            difficulty=difficulty,
            options=([{"ru": "Вверх", "kk": "Жоғары", "en": "Up"}, {"ru": "Вниз", "kk": "Төмен", "en": "Down"}] if task_id == "task-parabola" else options),
            acceptable_answers=answers,
            hint=_add_en(hint, en_hint),
            explanation=_add_en(explanation, en_explanation),
            is_published=True,
        )

    diagnostic_rows = [
        ("diag-common-factor", "common-factor", "task-common-factor", 1),
        ("diag-grouping", "grouping", "task-grouping", 1),
        ("diag-discriminant", "discriminant", "task-discriminant", 2),
        ("diag-quadratic-roots", "quadratic-roots", "task-quadratic-roots", 2),
        ("diag-parabola", "parabola", "task-parabola", 3),
        ("diag-vertex", "vertex", "task-vertex", 3),
    ]
    for order_index, (question_id, skill_id, task_id, difficulty) in enumerate(diagnostic_rows, 1):
        task = db.session.get(Task, task_id)
        _upsert(
            DiagnosticQuestion,
            question_id,
            subject_id="mathematics",
            skill_id=skill_id,
            prompt=task.prompt,
            options=task.options,
            acceptable_answers=task.acceptable_answers,
            difficulty=difficulty,
            order_index=order_index,
        )

    # Extra variants keep repeated diagnostics and practice sessions fresh. A
    # diagnostic selects one stable variant per skill; learning adaptation can
    # switch between the published tasks according to recommended difficulty.
    variant_tasks = [
        ("task-common-factor-v2", "lesson-factoring", "common-factor", 1,
         "Вынесите общий множитель: 8x + 20.", ["4(2x+5)", "2(4x+10)", "8(x+20)"], ["4(2x+5)"],
         "Найдите наибольший общий делитель 8 и 20.", "НОД равен 4, поэтому 8x + 20 = 4(2x + 5)."),
        ("task-common-factor-v3", "lesson-factoring", "common-factor", 2,
         "Вынесите общий множитель: 15a² − 10a.", [], ["5a(3a-2)"],
         "Обе части делятся на 5a.", "15a² − 10a = 5a(3a − 2)."),
        ("task-grouping-v2", "lesson-factoring", "grouping", 2,
         "Разложите x² + 7x + 12 на множители.", ["(x+3)(x+4)", "(x+2)(x+6)", "(x-3)(x-4)"], ["(x+3)(x+4)", "(x+4)(x+3)"],
         "Найдите числа с суммой 7 и произведением 12.", "Подходят 3 и 4: (x + 3)(x + 4)."),
        ("task-grouping-v3", "lesson-factoring", "grouping", 3,
         "Разложите x² − x − 12 на множители.", [], ["(x-4)(x+3)", "(x+3)(x-4)"],
         "Нужны числа с суммой −1 и произведением −12.", "Числа −4 и 3 дают (x − 4)(x + 3)."),
        ("task-discriminant-v2", "lesson-quadratic-equations", "discriminant", 2,
         "Найдите дискриминант уравнения x² + 6x + 5 = 0.", ["16", "36", "56"], ["16"],
         "Используйте D=b²−4ac.", "D = 6² − 4·1·5 = 16."),
        ("task-discriminant-v3", "lesson-quadratic-equations", "discriminant", 3,
         "Найдите дискриминант уравнения 2x² − 3x − 2 = 0.", [], ["25"],
         "Здесь a=2, b=−3, c=−2.", "D = (−3)² − 4·2·(−2) = 25."),
        ("task-quadratic-roots-v2", "lesson-quadratic-equations", "quadratic-roots", 2,
         "Укажите корни x² − 7x + 12 = 0 через запятую.", [], ["3,4", "4,3"],
         "Разложите выражение на два множителя.", "(x−3)(x−4)=0, поэтому корни 3 и 4."),
        ("task-quadratic-roots-v3", "lesson-quadratic-equations", "quadratic-roots", 3,
         "Укажите корни x² + x − 6 = 0 через запятую.", [], ["-3,2", "2,-3"],
         "Найдите числа с суммой 1 и произведением −6.", "(x+3)(x−2)=0, поэтому корни −3 и 2."),
        ("task-parabola-v2", "lesson-quadratic-functions", "parabola", 1,
         "Куда направлены ветви параболы y=−3x²?", ["Вверх", "Вниз"], ["вниз", "down"],
         "Посмотрите на знак коэффициента перед x².", "Коэффициент отрицательный, поэтому ветви направлены вниз."),
        ("task-parabola-v3", "lesson-quadratic-functions", "parabola", 2,
         "Какая парабола уже: y=4x² или y=0,5x²?", ["y=4x²", "y=0,5x²"], ["y=4x²", "4x²"],
         "Чем больше модуль коэффициента a, тем уже парабола.", "У функции y=4x² модуль коэффициента больше."),
        ("task-vertex-v2", "lesson-quadratic-functions", "vertex", 2,
         "Укажите вершину y=(x+1)²−4 в формате x,y.", [], ["-1,-4"],
         "Представьте x+1 как x−(−1).", "Вершина параболы находится в точке (−1, −4)."),
        ("task-vertex-v3", "lesson-quadratic-functions", "vertex", 3,
         "Укажите вершину y=−2(x−3)²+5 в формате x,y.", [], ["3,5"],
         "Сравните с y=a(x−h)²+k.", "Здесь h=3 и k=5, поэтому вершина — (3, 5)."),
    ]
    diagnostic_skill_order = ["common-factor", "grouping", "discriminant", "quadratic-roots", "parabola", "vertex"]
    diagnostic_order = {skill_id: index for index, skill_id in enumerate(diagnostic_skill_order, 1)}
    for task_id, lesson_id, skill_id, difficulty, prompt_ru, options, answers, hint_ru, explanation_ru in variant_tasks:
        task = _upsert(
            Task,
            task_id,
            lesson_id=lesson_id,
            skill_id=skill_id,
            prompt={"ru": prompt_ru, "kk": prompt_ru, "en": prompt_ru},
            task_type="single_choice" if options else "short_answer",
            difficulty=difficulty,
            options=options,
            acceptable_answers=answers,
            hint={"ru": hint_ru, "kk": hint_ru, "en": hint_ru},
            explanation={"ru": explanation_ru, "kk": explanation_ru, "en": explanation_ru},
            is_published=True,
        )
        _upsert(
            DiagnosticQuestion,
            f"diag-{task_id.removeprefix('task-')}",
            subject_id="mathematics",
            skill_id=skill_id,
            prompt=task.prompt,
            options=task.options,
            acceptable_answers=task.acceptable_answers,
            difficulty=difficulty,
            order_index=diagnostic_order[skill_id],
        )

    # This account intentionally has no diagnostic, path, attempts, or mastery.
    # It is the account used to test the student journey from its first step.
    student = _demo_user("demo-student", "student@sanaq.demo", "Айару Демо", "student")
    teacher = _demo_user("demo-teacher", "teacher@sanaq.demo", "Айгуль Демо", "teacher")
    admin = _demo_user("demo-admin", "admin@sanaq.demo", "Администратор SANAQ", "admin")
    classmates = [
        _demo_user("demo-student-stable", "student.stable@sanaq.demo", "Алина Касымова", "student"),
        _demo_user("demo-student-attention", "student.attention@sanaq.demo", "Данияр Мусин", "student"),
        _demo_user("demo-student-risk", "student.risk@sanaq.demo", "Арсен Тлеубаев", "student"),
    ]
    db.session.flush()

    student_profile = db.session.get(StudentProfile, student.id)
    if student_profile is None:
        db.session.add(StudentProfile(
            user_id=student.id, grade=9, subject_ids=["mathematics"],
            goal_ids=["school_program"], level="developing",
        ))
    teacher_profile = db.session.get(TeacherProfile, teacher.id)
    if teacher_profile is None:
        db.session.add(TeacherProfile(
            user_id=teacher.id, school="SANAQ Demo School", subject_ids=["mathematics"],
        ))
    for classmate in classmates:
        if db.session.get(StudentProfile, classmate.id) is None:
            db.session.add(StudentProfile(
                user_id=classmate.id, grade=9, subject_ids=["mathematics"],
                goal_ids=["school_program"], level="developing",
            ))

    classroom = db.session.get(Classroom, "demo-class-9a")
    if classroom is None:
        classroom = Classroom(
            id="demo-class-9a", teacher_id=teacher.id, name="9A · Демо",
            subject_id="mathematics", grade=9, join_code="SANAQ9A",
        )
        db.session.add(classroom)
    if db.session.get(ClassEnrollment, (classroom.id, student.id)) is None:
        db.session.add(ClassEnrollment(class_id=classroom.id, student_id=student.id))

    for classmate in classmates:
        if db.session.get(ClassEnrollment, (classroom.id, classmate.id)) is None:
            db.session.add(ClassEnrollment(class_id=classroom.id, student_id=classmate.id))

    # Populate contrasting mastery profiles so heatmaps, risk labels and student
    # drill-down screens are meaningful immediately after seeding.
    mastery_profiles = {
        "demo-student-stable": [0.95, 0.88, 0.82, 0.76, 0.72, 0.68],
        "demo-student-attention": [0.78, 0.61, 0.49, 0.42, 0.35, 0.28],
        "demo-student-risk": [0.46, 0.31, 0.22, 0.14, 0.08, 0.04],
    }
    skill_ids = ["common-factor", "grouping", "discriminant", "quadratic-roots", "parabola", "vertex"]
    now = datetime.now(timezone.utc)
    for student_id, mastery_values in mastery_profiles.items():
        for index, (skill_id, mastery) in enumerate(zip(skill_ids, mastery_values)):
            _upsert(
                KnowledgeState,
                f"seed-state-{student_id}-{skill_id}",
                student_id=student_id,
                skill_id=skill_id,
                mastery=mastery,
                confidence=min(0.95, mastery + 0.12),
                last_seen_at=now - timedelta(days=index % 3),
                next_review_at=now + timedelta(days=max(1, index + 1)),
            )

    # A mix of complete, partial and untouched assignment progress exercises all
    # teacher-side status branches. The clean student stays untouched.
    completed_tasks = {
        "demo-student-stable": ["task-common-factor", "task-grouping"],
        "demo-student-attention": ["task-common-factor"],
    }
    for student_id, task_ids in completed_tasks.items():
        for index, task_id in enumerate(task_ids):
            _upsert(
                Attempt,
                f"seed-attempt-{student_id}-{task_id}",
                student_id=student_id,
                task_id=task_id,
                status="completed",
                difficulty=1 if task_id == "task-common-factor" else 2,
                score=1.0 if student_id.endswith("stable") else 0.7,
                started_at=now - timedelta(days=index + 1, minutes=12),
                completed_at=now - timedelta(days=index + 1),
            )

    _upsert(
        Assignment,
        "demo-assignment-published",
        class_id=classroom.id,
        teacher_id=teacher.id,
        title="Повторить разложение на множители",
        module_id="module-factoring",
        task_id=None,
        due_at=now + timedelta(days=5),
        status="published",
        created_at=now - timedelta(days=2),
    )
    _upsert(
        Assignment,
        "demo-assignment-draft",
        class_id=classroom.id,
        teacher_id=teacher.id,
        title="Квадратные уравнения · черновик",
        module_id="module-quadratic-equations",
        task_id=None,
        due_at=now + timedelta(days=12),
        status="draft",
        created_at=now - timedelta(days=1),
    )
    _upsert(
        ClassAnnouncement,
        "demo-announcement-welcome",
        class_id=classroom.id,
        teacher_id=teacher.id,
        title="Подготовка к занятию",
        body="Повторите формулу дискриминанта и принесите тетрадь.",
        is_pinned=True,
        created_at=now - timedelta(hours=8),
        updated_at=now - timedelta(hours=8),
    )
    _upsert(
        TeacherComment,
        "demo-comment-attention",
        teacher_id=teacher.id,
        student_id="demo-student-attention",
        message="Закрепи общий множитель перед переходом к квадратным уравнениям.",
        add_to_plan=True,
        created_at=now - timedelta(days=1),
    )
    _upsert(
        Notification,
        "demo-notification-assignment",
        user_id=student.id,
        title="Новое назначение",
        body="Повторить разложение на множители",
        link="/student/class",
        read_at=None,
        created_at=now - timedelta(hours=2),
    )
    _upsert(
        AIReport,
        "demo-ai-report-open",
        reporter_id=student.id,
        feedback_id="demo-feedback-001",
        reason="Объяснение показалось слишком сложным для 9 класса.",
        status="open",
        resolution=None,
        created_at=now - timedelta(days=1),
        updated_at=now - timedelta(days=1),
    )
    _upsert(
        AuditLog,
        "demo-audit-seed",
        actor_id=admin.id,
        action="content.approved",
        entity_type="learning_module",
        entity_id="module-factoring",
        details={"source": "demo_seed"},
        created_at=now - timedelta(hours=3),
    )

    db.session.commit()
