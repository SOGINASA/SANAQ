import hashlib
from datetime import date, datetime, timedelta, timezone

from models import (
    Diagnostic,
    DiagnosticAnswer,
    DiagnosticQuestion,
    KnowledgeState,
    LearningPath,
    LearningStep,
    Lesson,
    PrerequisiteEdge,
    Skill,
    StudentProfile,
    StudentGoal,
    Task,
    Topic,
    db,
)
from utils.localization import localized


MASTERY_THRESHOLD = 0.75
ALGORITHM_VERSION = "prerequisite-gap-v1"
PACE_SETTINGS = {
    "light": (15, 25),
    "balanced": (30, 45),
    "intensive": (45, 60),
}


def available_learning_skills(subject_id):
    """Return only skills that already have publishable learning content.

    The curriculum catalog is broader than the current lesson library. Keeping
    this boundary explicit prevents learning paths and knowledge maps from
    exposing empty steps while content is being authored.
    """
    return db.session.scalars(
        db.select(Skill)
        .join(Topic, Skill.topic_id == Topic.id)
        .where(
            Topic.subject_id == subject_id,
            db.exists().where(
                Task.skill_id == Skill.id,
                Task.is_published.is_(True),
            ),
        )
        .order_by(Skill.order_index)
    ).all()


def normalize_answer(value):
    return (
        str(value)
        .strip()
        .casefold()
        .replace(" ", "")
        .replace("−", "-")
        .replace(";", ",")
        .replace("×", "*")
    )


def answer_is_correct(answer, acceptable_answers):
    normalized = normalize_answer(answer)
    return normalized in {normalize_answer(item) for item in (acceptable_answers or [])}


def selected_diagnostic_questions(diagnostic):
    """Choose one stable question variant per skill for this diagnostic.

    The diagnostic id makes different runs receive different variants, while
    keeping the selection unchanged when a learner refreshes or resumes.
    """
    query = (
        db.select(DiagnosticQuestion)
        .join(Skill, DiagnosticQuestion.skill_id == Skill.id)
        .join(Topic, Skill.topic_id == Topic.id)
        .where(
            DiagnosticQuestion.subject_id == diagnostic.subject_id,
            Topic.grade == diagnostic.grade,
        )
    )
    if diagnostic.subject_id == "mathematics" and diagnostic.grade == 9:
        query = query.where(DiagnosticQuestion.id.not_like("diag-math-g%"))
    questions = db.session.scalars(
        query.order_by(DiagnosticQuestion.order_index, DiagnosticQuestion.id)
    ).all()
    variants_by_skill = {}
    for question in questions:
        variants_by_skill.setdefault(question.skill_id, []).append(question)
    selected = []
    for skill_id, variants in variants_by_skill.items():
        digest = hashlib.sha256(f"{diagnostic.id}:{skill_id}".encode("utf-8")).digest()
        selected.append(variants[int.from_bytes(digest[:4], "big") % len(variants)])
    return sorted(selected, key=lambda item: (item.order_index, item.id))


def mastery_status(mastery, next_review_at=None):
    if next_review_at:
        review_at = next_review_at
        if review_at.tzinfo is None:
            review_at = review_at.replace(tzinfo=timezone.utc)
        if review_at <= datetime.now(timezone.utc):
            return "review_due"
    if mastery >= MASTERY_THRESHOLD:
        return "mastered"
    if mastery >= 0.45:
        return "learning"
    return "available"


def complete_diagnostic_profile(diagnostic):
    questions = selected_diagnostic_questions(diagnostic)
    answers = db.session.scalars(
        db.select(DiagnosticAnswer).where(DiagnosticAnswer.diagnostic_id == diagnostic.id)
    ).all()
    answers_by_question = {answer.question_id: answer for answer in answers}

    strengths = []
    gaps = []
    correct_count = 0
    for question in questions:
        answer = answers_by_question.get(question.id)
        is_correct = bool(answer and answer.is_correct)
        correct_count += int(is_correct)
        mastery = 0.85 if is_correct else 0.25
        state = db.session.scalar(
            db.select(KnowledgeState).filter_by(
                student_id=diagnostic.student_id,
                skill_id=question.skill_id,
            )
        ) or KnowledgeState(student_id=diagnostic.student_id, skill_id=question.skill_id)
        state.mastery = mastery
        state.confidence = 0.75
        state.last_seen_at = datetime.now(timezone.utc)
        state.next_review_at = datetime.now(timezone.utc) + timedelta(days=7 if is_correct else 1)
        db.session.add(state)
        (strengths if is_correct else gaps).append(question.skill_id)

    score = correct_count / len(questions) if questions else 0.0
    level = "advanced" if score >= 0.8 else "intermediate" if score >= 0.5 else "foundation"
    return {
        "score": round(score, 2),
        "level": level,
        "strengths": strengths,
        "gaps": gaps,
    }


def build_or_recalculate_path(student_id, subject_id, goal_id, diagnostic_id=None, path=None):
    operation = "create" if path is None else "recalculate"
    if path is None:
        path = LearningPath(
            student_id=student_id,
            subject_id=subject_id,
            goal_id=goal_id,
            diagnostic_id=diagnostic_id,
            title={"ru": "Персональный маршрут по математике", "kk": "Математика бойынша жеке бағыт"},
            target_date=date.today() + timedelta(days=30),
            weekday_minutes=PACE_SETTINGS["balanced"][0],
            weekend_minutes=PACE_SETTINGS["balanced"][1],
            algorithm_version=ALGORITHM_VERSION,
        )
        db.session.add(path)
        db.session.flush()
    else:
        db.session.execute(db.delete(LearningStep).where(LearningStep.path_id == path.id))

    skills = available_learning_skills(subject_id)
    profile = db.session.get(StudentProfile, student_id)
    diagnostic = db.session.get(Diagnostic, diagnostic_id) if diagnostic_id else None
    grade = diagnostic.grade if diagnostic else profile.grade if profile else 9
    from services.learning_plan import rank_student_curriculum, record_path_ranking
    from services.planner import PlannerConfig, generate_deterministic_plan

    curriculum_state, ranked_ids, ranking = rank_student_curriculum(
        student_id,
        subject_id,
        grade,
        selectable_skill_ids=[skill.id for skill in skills],
    )
    state_item_by_skill = {item["id"]: item for item in curriculum_state["items"]}
    target_date = path.target_date or date.today() + timedelta(days=30)
    if target_date < date.today():
        target_date = date.today() + timedelta(days=30)
        path.target_date = target_date
    plan = generate_deterministic_plan(
        curriculum_state,
        PlannerConfig(
            start_date=date.today(),
            target_date=target_date,
            weekday_minutes=path.weekday_minutes or PACE_SETTINGS["balanced"][0],
            weekend_minutes=path.weekend_minutes or PACE_SETTINGS["balanced"][1],
            max_skills=20,
        ),
        ranked_ids,
    )
    ordered_ids = []
    schedule_by_skill = {}
    for day in plan["days"]:
        for item in day["items"]:
            skill_id = item["skill_id"]
            schedule = schedule_by_skill.setdefault(skill_id, {
                "planned_date": date.fromisoformat(day["date"]),
                "planned_minutes": 0,
            })
            schedule["planned_minutes"] += item["duration_minutes"]
            if item["activity"] != "spaced_review" and skill_id not in ordered_ids:
                ordered_ids.append(skill_id)

    # A defensive fallback keeps a usable route even if a very short target
    # horizon cannot fit a complete planner block.
    if not ordered_ids:
        ordered_ids = ranked_ids[:20]

    if diagnostic:
        diagnosed_gap_ids = [
            question.skill_id
            for question in selected_diagnostic_questions(diagnostic)
            if question.skill_id in ordered_ids
            and state_item_by_skill.get(question.skill_id, {}).get("mastery", 0) < MASTERY_THRESHOLD
        ]
        ordered_ids = diagnosed_gap_ids + [
            skill_id for skill_id in ordered_ids if skill_id not in diagnosed_gap_ids
        ]
    skill_by_id = {skill.id: skill for skill in skills}
    ordered_skills = [
        skill_by_id[skill_id] for skill_id in ordered_ids if skill_id in skill_by_id
    ]
    states = db.session.scalars(
        db.select(KnowledgeState).where(
            KnowledgeState.student_id == student_id,
            KnowledgeState.skill_id.in_(ordered_ids),
        )
    ).all() if ordered_ids else []
    state_by_skill = {state.skill_id: state for state in states}

    first_open_assigned = False
    for order_index, skill in enumerate(ordered_skills, 1):
        state = state_by_skill.get(skill.id)
        mastery = state.mastery if state else 0.0
        if mastery >= MASTERY_THRESHOLD:
            status = "completed"
        elif not first_open_assigned:
            status = "available"
            first_open_assigned = True
        else:
            status = "locked"
        task = db.session.scalar(
            db.select(Task).filter_by(skill_id=skill.id, is_published=True).order_by(Task.difficulty)
        )
        reason = {
            "ru": (
                f"Навык «{localized(skill.name, 'ru')}» выбран с учётом диагностики, "
                f"зависимостей и ранжирования {ranking['applied']}."
            ),
            "kk": (
                f"«{localized(skill.name, 'kk')}» дағдысы диагностика, тақырып байланыстары "
                f"және {ranking['applied']} реттеуі негізінде таңдалды."
            ),
        }
        db.session.add(LearningStep(
            path_id=path.id,
            skill_id=skill.id,
            task_id=task.id,
            order_index=order_index,
            status=status,
            reason=reason,
            confidence=state.confidence if state else 0.5,
            planned_date=schedule_by_skill.get(skill.id, {}).get("planned_date"),
            planned_minutes=schedule_by_skill.get(skill.id, {}).get("planned_minutes", 0),
            completed_at=datetime.now(timezone.utc) if status == "completed" else None,
        ))
    path.algorithm_version = ranking.get(
        "model_version", ranking["planner_version"]
    )[:50]
    path.updated_at = datetime.now(timezone.utc)
    db.session.flush()
    path._ranking = ranking
    path._study_plan_summary = plan["summary"]
    record_path_ranking(student_id, path.id, operation, ranking)
    return path


def path_progress(path_id):
    steps = db.session.scalars(
        db.select(LearningStep).where(LearningStep.path_id == path_id)
    ).all()
    if not steps:
        return 0.0
    return round(sum(step.status == "completed" for step in steps) / len(steps), 2)


def serialize_step(step, include_task=True):
    skill = db.session.get(Skill, step.skill_id)
    path = db.session.get(LearningPath, step.path_id)
    payload = {
        "id": step.id,
        "skill_id": step.skill_id,
        "skill_name": localized(skill.name),
        "order": step.order_index,
        "status": step.status,
        "reason": localized(step.reason),
        "source_skill_ids": [step.skill_id],
        "confidence": round(step.confidence, 2),
        "algorithm_version": path.algorithm_version if path else ALGORITHM_VERSION,
        "planned_date": step.planned_date.isoformat() if step.planned_date else None,
        "planned_minutes": step.planned_minutes,
    }
    if include_task:
        payload["task_id"] = step.task_id
        task = db.session.get(Task, step.task_id)
        lesson = db.session.get(Lesson, task.lesson_id) if task else None
        payload["lesson_id"] = lesson.id if lesson else None
        payload["module_id"] = lesson.module_id if lesson else None
    return payload


def serialize_path(path, include_steps=True):
    from services.learning_plan import path_ranking_metadata

    payload = {
        "id": path.id,
        "subject_id": path.subject_id,
        "goal_id": path.goal_id,
        "diagnostic_id": path.diagnostic_id,
        "title": localized(path.title),
        "status": path.status,
        "pace": path.pace,
        "weekday_minutes": path.weekday_minutes,
        "weekend_minutes": path.weekend_minutes,
        "target_date": path.target_date.isoformat() if path.target_date else None,
        "progress": path_progress(path.id),
        "algorithm_version": path.algorithm_version,
        "ranking": path_ranking_metadata(path),
    }
    all_steps = db.session.scalars(
        db.select(LearningStep).where(LearningStep.path_id == path.id)
    ).all()
    remaining_steps = sum(step.status != "completed" for step in all_steps)
    steps_per_week = {"light": 3, "balanced": 5, "intensive": 7}.get(path.pace, 5)
    estimated_days = 0 if remaining_steps == 0 else max(1, round(remaining_steps / steps_per_week * 7))
    estimated_date = date.today() + timedelta(days=estimated_days)
    goal = db.session.scalar(
        db.select(StudentGoal).where(
            StudentGoal.student_id == path.student_id,
            StudentGoal.status == "active",
        ).order_by(StudentGoal.target_date, StudentGoal.created_at.desc())
    )
    target_date = path.target_date or (goal.target_date if goal else None)
    payload["goal_projection"] = {
        "goal_id": goal.id if goal else None,
        "title": goal.title if goal else localized(path.title),
        "target_date": target_date.isoformat() if target_date else None,
        "remaining_steps": remaining_steps,
        "total_steps": len(all_steps),
        "estimated_days": estimated_days,
        "estimated_completion_date": estimated_date.isoformat(),
        "steps_per_week": steps_per_week,
        "status": "completed" if not remaining_steps else "at_risk" if target_date and estimated_date > target_date else "on_track",
    }
    if include_steps:
        steps = db.session.scalars(
            db.select(LearningStep)
            .where(LearningStep.path_id == path.id)
            .order_by(LearningStep.order_index)
        ).all()
        payload["steps"] = [serialize_step(step) for step in steps]
        payload["schedule"] = {
            "selected_skills": len(steps),
            "scheduled_days": len({step.planned_date for step in steps if step.planned_date}),
            "planned_minutes": sum(step.planned_minutes or 0 for step in steps),
        }
    return payload


def apply_attempt_result(attempt, task, is_correct):
    state = db.session.scalar(
        db.select(KnowledgeState).filter_by(
            student_id=attempt.student_id,
            skill_id=task.skill_id,
        )
    ) or KnowledgeState(student_id=attempt.student_id, skill_id=task.skill_id)
    previous = state.mastery or 0.0
    if is_correct:
        state.mastery = min(1.0, max(MASTERY_THRESHOLD, previous + 0.45))
        review_days = 7 if state.mastery >= 0.9 else 3
    else:
        state.mastery = max(0.0, previous - 0.05)
        review_days = 1
    state.confidence = min(1.0, (state.confidence or 0.0) + 0.1)
    state.last_seen_at = datetime.now(timezone.utc)
    state.next_review_at = datetime.now(timezone.utc) + timedelta(days=review_days)
    db.session.add(state)

    if is_correct:
        steps = db.session.scalars(
            db.select(LearningStep)
            .join(LearningPath, LearningStep.path_id == LearningPath.id)
            .where(
                LearningPath.student_id == attempt.student_id,
                LearningPath.status == "active",
                LearningStep.skill_id == task.skill_id,
            )
        ).all()
        for step in steps:
            step.status = "completed"
            step.completed_at = datetime.now(timezone.utc)
            next_step = db.session.scalar(
                db.select(LearningStep)
                .where(
                    LearningStep.path_id == step.path_id,
                    LearningStep.order_index > step.order_index,
                    LearningStep.status == "locked",
                )
                .order_by(LearningStep.order_index)
            )
            if next_step:
                next_step.status = "available"
    db.session.flush()
    return previous, state


def prerequisite_ids(skill_id):
    return list(db.session.scalars(
        db.select(PrerequisiteEdge.prerequisite_skill_id).where(PrerequisiteEdge.skill_id == skill_id)
    ).all())
