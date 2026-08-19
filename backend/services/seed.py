"""Stable demo content for the SANAQ mathematics vertical slice."""

from models import (
    ClassEnrollment,
    Classroom,
    DiagnosticQuestion,
    LearningModule,
    Lesson,
    PrerequisiteEdge,
    Skill,
    StudentProfile,
    Subject,
    Task,
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


def seed_demo_data():
    seed_math_curriculum(commit=False)
    _upsert(
        Subject,
        "mathematics",
        name={"ru": "Математика", "kk": "Математика"},
        grades=[7, 8, 9, 10, 11, 12],
    )

    topics = [
        ("factoring", {"ru": "Разложение на множители", "kk": "Көбейткіштерге жіктеу"}, 1),
        ("quadratic-equations", {"ru": "Квадратные уравнения", "kk": "Квадрат теңдеулер"}, 2),
        ("quadratic-functions", {"ru": "Квадратичная функция", "kk": "Квадраттық функция"}, 3),
    ]
    for topic_id, name, order_index in topics:
        _upsert(
            Topic,
            topic_id,
            subject_id="mathematics",
            name=name,
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
    for skill_id, topic_id, name, order_index in skills:
        _upsert(Skill, skill_id, topic_id=topic_id, name=name, order_index=order_index)

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
    for module_id, topic_id, title, description in module_rows:
        _upsert(
            LearningModule,
            module_id,
            subject_id="mathematics",
            topic_id=topic_id,
            title=title,
            description=description,
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
    for index, (lesson_id, module_id, title, theory, example) in enumerate(lessons, 1):
        _upsert(
            Lesson,
            lesson_id,
            module_id=module_id,
            title=title,
            theory=theory,
            example=example,
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
    for task_id, lesson_id, skill_id, difficulty, prompt, options, answers, hint, explanation in tasks:
        _upsert(
            Task,
            task_id,
            lesson_id=lesson_id,
            skill_id=skill_id,
            prompt=prompt,
            task_type="single_choice" if options else "short_answer",
            difficulty=difficulty,
            options=options,
            acceptable_answers=answers,
            hint=hint,
            explanation=explanation,
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

    student = _demo_user("demo-student", "student@sanaq.demo", "Айару Демо", "student")
    teacher = _demo_user("demo-teacher", "teacher@sanaq.demo", "Айгуль Демо", "teacher")
    _demo_user("demo-admin", "admin@sanaq.demo", "Администратор SANAQ", "admin")
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

    classroom = db.session.get(Classroom, "demo-class-9a")
    if classroom is None:
        classroom = Classroom(
            id="demo-class-9a", teacher_id=teacher.id, name="9A · Демо",
            subject_id="mathematics", grade=9, join_code="SANAQ9A",
        )
        db.session.add(classroom)
    if db.session.get(ClassEnrollment, (classroom.id, student.id)) is None:
        db.session.add(ClassEnrollment(class_id=classroom.id, student_id=student.id))

    db.session.commit()
