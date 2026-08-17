from datetime import datetime, timedelta, timezone

from models import (
    DiagnosticAnswer,
    DiagnosticQuestion,
    KnowledgeState,
    LearningPath,
    LearningStep,
    PrerequisiteEdge,
    Skill,
    Task,
    Topic,
    db,
)
from utils.localization import localized


MASTERY_THRESHOLD = 0.75
ALGORITHM_VERSION = "prerequisite-gap-v1"


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
    questions = db.session.scalars(
        db.select(DiagnosticQuestion)
        .where(DiagnosticQuestion.subject_id == diagnostic.subject_id)
        .order_by(DiagnosticQuestion.order_index)
    ).all()
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
    if path is None:
        path = LearningPath(
            student_id=student_id,
            subject_id=subject_id,
            goal_id=goal_id,
            diagnostic_id=diagnostic_id,
            title={"ru": "Персональный маршрут по математике", "kk": "Математика бойынша жеке бағыт"},
            algorithm_version=ALGORITHM_VERSION,
        )
        db.session.add(path)
        db.session.flush()
    else:
        db.session.execute(db.delete(LearningStep).where(LearningStep.path_id == path.id))

    skills = available_learning_skills(subject_id)
    states = db.session.scalars(
        db.select(KnowledgeState).where(
            KnowledgeState.student_id == student_id,
            KnowledgeState.skill_id.in_([skill.id for skill in skills]),
        )
    ).all() if skills else []
    state_by_skill = {state.skill_id: state for state in states}

    first_open_assigned = False
    for order_index, skill in enumerate(skills, 1):
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
            "ru": f"Навык «{localized(skill.name, 'ru')}» выбран с учётом диагностики и зависимостей тем.",
            "kk": f"«{localized(skill.name, 'kk')}» дағдысы диагностика мен тақырып байланыстары негізінде таңдалды.",
        }
        db.session.add(LearningStep(
            path_id=path.id,
            skill_id=skill.id,
            task_id=task.id,
            order_index=order_index,
            status=status,
            reason=reason,
            confidence=state.confidence if state else 0.5,
            completed_at=datetime.now(timezone.utc) if status == "completed" else None,
        ))
    path.updated_at = datetime.now(timezone.utc)
    db.session.flush()
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
    payload = {
        "id": step.id,
        "skill_id": step.skill_id,
        "skill_name": localized(skill.name),
        "order": step.order_index,
        "status": step.status,
        "reason": localized(step.reason),
        "source_skill_ids": [step.skill_id],
        "confidence": round(step.confidence, 2),
        "algorithm_version": ALGORITHM_VERSION,
    }
    if include_task:
        payload["task_id"] = step.task_id
    return payload


def serialize_path(path, include_steps=True):
    payload = {
        "id": path.id,
        "subject_id": path.subject_id,
        "goal_id": path.goal_id,
        "diagnostic_id": path.diagnostic_id,
        "title": localized(path.title),
        "status": path.status,
        "pace": path.pace,
        "target_date": path.target_date.isoformat() if path.target_date else None,
        "progress": path_progress(path.id),
        "algorithm_version": path.algorithm_version,
    }
    if include_steps:
        steps = db.session.scalars(
            db.select(LearningStep)
            .where(LearningStep.path_id == path.id)
            .order_by(LearningStep.order_index)
        ).all()
        payload["steps"] = [serialize_step(step) for step in steps]
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
