import uuid
from datetime import datetime, timezone

import bcrypt
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()

USER_ROLES = {"student", "teacher", "admin"}


def utc_now():
    return datetime.now(timezone.utc)


def utc_iso(value):
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(254), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="student", index=True)
    locale = db.Column(db.String(5), nullable=False, default="ru")
    region = db.Column(db.String(100))
    timezone = db.Column(db.String(64), nullable=False, default="Asia/Qyzylorda")
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_verified = db.Column(db.Boolean, nullable=False, default=False)
    parental_consent_required = db.Column(db.Boolean, nullable=False, default=False)
    parental_consent_status = db.Column(db.String(20), nullable=False, default="not_required")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)
    last_login_at = db.Column(db.DateTime(timezone=True))
    preferences = db.Column(db.JSON, nullable=False, default=dict)
    reset_token_hash = db.Column(db.String(64), unique=True)
    reset_token_expires_at = db.Column(db.DateTime(timezone=True))

    student_profile = db.relationship(
        "StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    teacher_profile = db.relationship(
        "TeacherProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    refresh_sessions = db.relationship(
        "RefreshSession", back_populates="user", cascade="all, delete-orphan"
    )

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def check_password(self, password):
        return bcrypt.checkpw(password.encode("utf-8"), self.password_hash.encode("utf-8"))

    def to_dict(self, include_status=False):
        result = {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "locale": self.locale,
            "region": self.region,
            "timezone": self.timezone,
            "parental_consent_required": self.parental_consent_required,
            "parental_consent_status": self.parental_consent_status,
            "created_at": utc_iso(self.created_at),
            "last_login_at": utc_iso(self.last_login_at),
        }
        if include_status:
            result.update({"is_active": self.is_active, "is_verified": self.is_verified})
        return result


class RefreshSession(db.Model):
    __tablename__ = "refresh_sessions"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    token_jti = db.Column(db.String(36), unique=True, nullable=False, index=True)
    user_agent = db.Column(db.String(255))
    ip_address = db.Column(db.String(64))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    revoked_at = db.Column(db.DateTime(timezone=True))

    user = db.relationship("User", back_populates="refresh_sessions")

    def to_dict(self):
        expires_at = self.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return {
            "id": self.id,
            "user_agent": self.user_agent,
            "ip_address": self.ip_address,
            "created_at": utc_iso(self.created_at),
            "expires_at": utc_iso(self.expires_at),
            "is_active": self.revoked_at is None and expires_at > utc_now(),
        }


class StudentProfile(db.Model):
    __tablename__ = "student_profiles"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    grade = db.Column(db.Integer)
    subject_ids = db.Column(db.JSON, nullable=False, default=list)
    goal_ids = db.Column(db.JSON, nullable=False, default=list)
    level = db.Column(db.String(30))
    accessibility_settings = db.Column(db.JSON, nullable=False, default=dict)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    user = db.relationship("User", back_populates="student_profile")

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "grade": self.grade,
            "subject_ids": self.subject_ids or [],
            "goal_ids": self.goal_ids or [],
            "level": self.level,
            "accessibility_settings": self.accessibility_settings or {},
            "updated_at": utc_iso(self.updated_at),
        }


class TeacherProfile(db.Model):
    __tablename__ = "teacher_profiles"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    school = db.Column(db.String(200))
    subject_ids = db.Column(db.JSON, nullable=False, default=list)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    user = db.relationship("User", back_populates="teacher_profile")

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "school": self.school,
            "subject_ids": self.subject_ids or [],
            "updated_at": utc_iso(self.updated_at),
        }


class Subject(db.Model):
    __tablename__ = "subjects"

    id = db.Column(db.String(64), primary_key=True)
    name = db.Column(db.JSON, nullable=False)
    grades = db.Column(db.JSON, nullable=False, default=list)


class Topic(db.Model):
    __tablename__ = "topics"

    id = db.Column(db.String(64), primary_key=True)
    subject_id = db.Column(db.String(64), db.ForeignKey("subjects.id"), nullable=False, index=True)
    name = db.Column(db.JSON, nullable=False)
    grade = db.Column(db.Integer, nullable=False, index=True)
    order_index = db.Column(db.Integer, nullable=False, default=0)


class Skill(db.Model):
    __tablename__ = "skills"

    id = db.Column(db.String(64), primary_key=True)
    topic_id = db.Column(db.String(64), db.ForeignKey("topics.id"), nullable=False, index=True)
    name = db.Column(db.JSON, nullable=False)
    order_index = db.Column(db.Integer, nullable=False, default=0)


class PrerequisiteEdge(db.Model):
    __tablename__ = "prerequisite_edges"

    skill_id = db.Column(db.String(64), db.ForeignKey("skills.id"), primary_key=True)
    prerequisite_skill_id = db.Column(db.String(64), db.ForeignKey("skills.id"), primary_key=True)


class CurriculumTopicMetadata(db.Model):
    __tablename__ = "curriculum_topic_metadata"

    topic_id = db.Column(db.String(64), db.ForeignKey("topics.id"), primary_key=True)
    strand = db.Column(db.String(40), nullable=False, index=True)
    curriculum_version = db.Column(db.String(40), nullable=False, index=True)
    source_scope = db.Column(db.String(40), nullable=False, default="kz_core")
    estimated_total_minutes = db.Column(db.Integer, nullable=False)


class SkillPlanningMetadata(db.Model):
    __tablename__ = "skill_planning_metadata"

    skill_id = db.Column(db.String(64), db.ForeignKey("skills.id"), primary_key=True)
    grade = db.Column(db.Integer, nullable=False, index=True)
    learning_minutes = db.Column(db.Integer, nullable=False)
    practice_minutes = db.Column(db.Integer, nullable=False)
    difficulty = db.Column(db.Float, nullable=False)
    importance = db.Column(db.Float, nullable=False)
    curriculum_version = db.Column(db.String(40), nullable=False, index=True)


class LearningModule(db.Model):
    __tablename__ = "learning_modules"

    id = db.Column(db.String(64), primary_key=True)
    subject_id = db.Column(db.String(64), db.ForeignKey("subjects.id"), nullable=False, index=True)
    topic_id = db.Column(db.String(64), db.ForeignKey("topics.id"), nullable=False, index=True)
    title = db.Column(db.JSON, nullable=False)
    description = db.Column(db.JSON, nullable=False)
    grade = db.Column(db.Integer, nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default="published")
    version = db.Column(db.Integer, nullable=False, default=1)


class Lesson(db.Model):
    __tablename__ = "lessons"

    id = db.Column(db.String(64), primary_key=True)
    module_id = db.Column(db.String(64), db.ForeignKey("learning_modules.id"), nullable=False, index=True)
    title = db.Column(db.JSON, nullable=False)
    theory = db.Column(db.JSON, nullable=False)
    example = db.Column(db.JSON, nullable=False)
    order_index = db.Column(db.Integer, nullable=False, default=0)


class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.String(64), primary_key=True)
    lesson_id = db.Column(db.String(64), db.ForeignKey("lessons.id"), nullable=False, index=True)
    skill_id = db.Column(db.String(64), db.ForeignKey("skills.id"), nullable=False, index=True)
    prompt = db.Column(db.JSON, nullable=False)
    task_type = db.Column(db.String(30), nullable=False, default="single_choice")
    difficulty = db.Column(db.Integer, nullable=False, default=1)
    options = db.Column(db.JSON, nullable=False, default=list)
    acceptable_answers = db.Column(db.JSON, nullable=False, default=list)
    hint = db.Column(db.JSON, nullable=False)
    explanation = db.Column(db.JSON, nullable=False)
    is_published = db.Column(db.Boolean, nullable=False, default=True)


class DiagnosticQuestion(db.Model):
    __tablename__ = "diagnostic_questions"

    id = db.Column(db.String(64), primary_key=True)
    subject_id = db.Column(db.String(64), db.ForeignKey("subjects.id"), nullable=False, index=True)
    skill_id = db.Column(db.String(64), db.ForeignKey("skills.id"), nullable=False, index=True)
    prompt = db.Column(db.JSON, nullable=False)
    options = db.Column(db.JSON, nullable=False, default=list)
    acceptable_answers = db.Column(db.JSON, nullable=False, default=list)
    difficulty = db.Column(db.Integer, nullable=False, default=1)
    order_index = db.Column(db.Integer, nullable=False, default=0)


class Diagnostic(db.Model):
    __tablename__ = "diagnostics"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    subject_id = db.Column(db.String(64), db.ForeignKey("subjects.id"), nullable=False, index=True)
    goal_id = db.Column(db.String(64), nullable=False)
    grade = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="in_progress", index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    completed_at = db.Column(db.DateTime(timezone=True))


class DiagnosticAnswer(db.Model):
    __tablename__ = "diagnostic_answers"
    __table_args__ = (db.UniqueConstraint("diagnostic_id", "question_id"),)

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    diagnostic_id = db.Column(db.String(36), db.ForeignKey("diagnostics.id"), nullable=False, index=True)
    question_id = db.Column(db.String(64), db.ForeignKey("diagnostic_questions.id"), nullable=False)
    answer = db.Column(db.String(500), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False)
    time_spent_seconds = db.Column(db.Integer, nullable=False, default=0)
    attempt_number = db.Column(db.Integer, nullable=False, default=1)
    answered_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)


class DiagnosticResult(db.Model):
    __tablename__ = "diagnostic_results"

    diagnostic_id = db.Column(db.String(36), db.ForeignKey("diagnostics.id"), primary_key=True)
    level = db.Column(db.String(30), nullable=False)
    score = db.Column(db.Float, nullable=False)
    strengths = db.Column(db.JSON, nullable=False, default=list)
    gaps = db.Column(db.JSON, nullable=False, default=list)
    explanation = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)


class KnowledgeState(db.Model):
    __tablename__ = "knowledge_states"
    __table_args__ = (db.UniqueConstraint("student_id", "skill_id"),)

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    skill_id = db.Column(db.String(64), db.ForeignKey("skills.id"), nullable=False, index=True)
    mastery = db.Column(db.Float, nullable=False, default=0.0)
    confidence = db.Column(db.Float, nullable=False, default=0.0)
    last_seen_at = db.Column(db.DateTime(timezone=True))
    next_review_at = db.Column(db.DateTime(timezone=True), index=True)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class LearningPath(db.Model):
    __tablename__ = "learning_paths"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    subject_id = db.Column(db.String(64), db.ForeignKey("subjects.id"), nullable=False, index=True)
    goal_id = db.Column(db.String(64), nullable=False)
    diagnostic_id = db.Column(db.String(36), db.ForeignKey("diagnostics.id"))
    title = db.Column(db.JSON, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="active", index=True)
    target_date = db.Column(db.Date)
    pace = db.Column(db.String(20), nullable=False, default="balanced")
    algorithm_version = db.Column(db.String(50), nullable=False, default="prerequisite-gap-v1")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class LearningStep(db.Model):
    __tablename__ = "learning_steps"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    path_id = db.Column(db.String(36), db.ForeignKey("learning_paths.id"), nullable=False, index=True)
    skill_id = db.Column(db.String(64), db.ForeignKey("skills.id"), nullable=False, index=True)
    task_id = db.Column(db.String(64), db.ForeignKey("tasks.id"), nullable=False)
    order_index = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="locked")
    reason = db.Column(db.JSON, nullable=False)
    confidence = db.Column(db.Float, nullable=False, default=0.8)
    completed_at = db.Column(db.DateTime(timezone=True))


class Attempt(db.Model):
    __tablename__ = "attempts"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    task_id = db.Column(db.String(64), db.ForeignKey("tasks.id"), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default="in_progress", index=True)
    difficulty = db.Column(db.Integer, nullable=False)
    score = db.Column(db.Float)
    started_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    completed_at = db.Column(db.DateTime(timezone=True))


class TaskAnswer(db.Model):
    __tablename__ = "task_answers"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    attempt_id = db.Column(db.String(36), db.ForeignKey("attempts.id"), nullable=False, index=True)
    answer = db.Column(db.String(500), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False)
    attempt_number = db.Column(db.Integer, nullable=False, default=1)
    answered_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)


class Classroom(db.Model):
    __tablename__ = "classrooms"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    subject_id = db.Column(db.String(64), db.ForeignKey("subjects.id"), nullable=False)
    grade = db.Column(db.Integer, nullable=False)
    join_code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)


class ClassEnrollment(db.Model):
    __tablename__ = "class_enrollments"

    class_id = db.Column(db.String(36), db.ForeignKey("classrooms.id"), primary_key=True)
    student_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    joined_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)


class Assignment(db.Model):
    __tablename__ = "assignments"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    class_id = db.Column(db.String(36), db.ForeignKey("classrooms.id"), nullable=False, index=True)
    teacher_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    module_id = db.Column(db.String(64), db.ForeignKey("learning_modules.id"))
    task_id = db.Column(db.String(64), db.ForeignKey("tasks.id"))
    target_student_ids = db.Column(db.JSON, nullable=False, default=list)
    assignment_kind = db.Column(db.String(30), nullable=False, default="standard")
    due_at = db.Column(db.DateTime(timezone=True))
    status = db.Column(db.String(20), nullable=False, default="draft", index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)


class ClassAnnouncement(db.Model):
    __tablename__ = "class_announcements"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    class_id = db.Column(db.String(36), db.ForeignKey("classrooms.id"), nullable=False, index=True)
    teacher_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(160), nullable=False)
    body = db.Column(db.Text, nullable=False)
    is_pinned = db.Column(db.Boolean, nullable=False, default=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class TeacherComment(db.Model):
    __tablename__ = "teacher_comments"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    student_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    message = db.Column(db.Text, nullable=False)
    add_to_plan = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=False)
    link = db.Column(db.String(300))
    read_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)


class AIConversation(db.Model):
    __tablename__ = "ai_conversations"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(120), nullable=False, default="Новый диалог")
    subject = db.Column(db.String(80), nullable=False, default="Математика")
    topic = db.Column(db.String(160), nullable=False, default="Общий вопрос")
    grade = db.Column(db.Integer, nullable=False, default=9)
    locale = db.Column(db.String(5), nullable=False, default="ru")
    status = db.Column(db.String(20), nullable=False, default="active", index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    messages = db.relationship(
        "AIMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="AIMessage.created_at",
    )

    def to_dict(self, include_messages=False):
        payload = {
            "id": self.id,
            "title": self.title,
            "subject": self.subject,
            "topic": self.topic,
            "grade": self.grade,
            "locale": self.locale,
            "status": self.status,
            "created_at": utc_iso(self.created_at),
            "updated_at": utc_iso(self.updated_at),
        }
        if include_messages:
            payload["messages"] = [message.to_dict() for message in self.messages]
        return payload

class AIMessage(db.Model):
    __tablename__ = "ai_messages"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = db.Column(db.String(36), db.ForeignKey("ai_conversations.id"), nullable=False, index=True)
    role = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    generated_by_ai = db.Column(db.Boolean, nullable=False, default=False)
    model_version = db.Column(db.String(120))
    prompt_version = db.Column(db.String(80))
    latency_ms = db.Column(db.Integer)
    source_ids = db.Column(db.JSON, nullable=False, default=list)
    safety_flags = db.Column(db.JSON, nullable=False, default=list)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)

    conversation = db.relationship("AIConversation", back_populates="messages")

    def to_dict(self):
        fallback_used = self.model_version == "deterministic-fallback-v1"
        return {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "generated_by_ai": self.generated_by_ai,
            "model_version": self.model_version,
            "fallback_used": fallback_used,
            "failure_code": "ai_provider_unavailable" if fallback_used else None,
            "prompt_version": self.prompt_version,
            "latency_ms": self.latency_ms,
            "source_ids": self.source_ids or [],
            "safety_flags": self.safety_flags or [],
            "created_at": utc_iso(self.created_at),
        }


class StudentGoal(db.Model):
    __tablename__ = "student_goals"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    target_date = db.Column(db.Date)
    status = db.Column(db.String(20), nullable=False, default="active", index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class MaterialUpload(db.Model):
    __tablename__ = "material_uploads"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    content_type = db.Column(db.String(100), nullable=False, default="application/octet-stream")
    upload_token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    content = db.Column(db.LargeBinary)
    status = db.Column(db.String(20), nullable=False, default="pending")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)


class AIReport(db.Model):
    __tablename__ = "ai_reports"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reporter_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    feedback_id = db.Column(db.String(100), nullable=False, index=True)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="open", index=True)
    resolution = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    action = db.Column(db.String(100), nullable=False, index=True)
    entity_type = db.Column(db.String(50), nullable=False)
    entity_id = db.Column(db.String(100))
    details = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)


class ProductEvent(db.Model):
    __tablename__ = "product_events"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    event_name = db.Column(db.String(100), nullable=False, index=True)
    properties = db.Column(db.JSON, nullable=False, default=dict)
    occurred_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
