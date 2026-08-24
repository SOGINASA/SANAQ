from sqlalchemy import inspect, text

from models import (
    AIConversation,
    AIMessage,
    ClassAnnouncement,
    CurriculumTopicMetadata,
    OAuthIdentity,
    OAuthLoginCode,
    PasskeyCredential,
    SkillPlanningMetadata,
    db,
)


AI_SCHEMA_COLUMNS = {
    "ai_conversations": {
        "title": "VARCHAR(120) DEFAULT 'Новый диалог' NOT NULL",
        "subject": "VARCHAR(80) DEFAULT 'Математика' NOT NULL",
        "grade": "INTEGER DEFAULT 9 NOT NULL",
        "locale": "VARCHAR(5) DEFAULT 'ru' NOT NULL",
        "status": "VARCHAR(20) DEFAULT 'active' NOT NULL",
    },
    "ai_messages": {
        "generated_by_ai": "BOOLEAN DEFAULT FALSE NOT NULL",
        "model_version": "VARCHAR(120)",
        "prompt_version": "VARCHAR(80)",
        "latency_ms": "INTEGER",
        "source_ids": "JSON DEFAULT '[]' NOT NULL",
        "safety_flags": "JSON DEFAULT '[]' NOT NULL",
    },
}

LEARNING_SCHEMA_COLUMNS = {
    "learning_paths": {
        "weekday_minutes": "INTEGER DEFAULT 30 NOT NULL",
        "weekend_minutes": "INTEGER DEFAULT 45 NOT NULL",
    },
    "learning_steps": {
        "planned_date": "DATE",
        "planned_minutes": "INTEGER DEFAULT 0 NOT NULL",
    },
}


def ensure_runtime_schema():
    """Create additive runtime tables and columns without touching existing data."""
    inspector = inspect(db.engine)
    tables = set(inspector.get_table_names())
    if "users" in tables:
        AIConversation.__table__.create(bind=db.engine, checkfirst=True)
        AIMessage.__table__.create(bind=db.engine, checkfirst=True)
        ClassAnnouncement.__table__.create(bind=db.engine, checkfirst=True)
        CurriculumTopicMetadata.__table__.create(bind=db.engine, checkfirst=True)
        SkillPlanningMetadata.__table__.create(bind=db.engine, checkfirst=True)
        OAuthIdentity.__table__.create(bind=db.engine, checkfirst=True)
        OAuthLoginCode.__table__.create(bind=db.engine, checkfirst=True)
        PasskeyCredential.__table__.create(bind=db.engine, checkfirst=True)
        inspector = inspect(db.engine)
        tables = set(inspector.get_table_names())
    for table_name, definitions in {**AI_SCHEMA_COLUMNS, **LEARNING_SCHEMA_COLUMNS}.items():
        if table_name not in tables:
            continue
        existing = {column["name"] for column in inspector.get_columns(table_name)}
        for column_name, definition in definitions.items():
            if column_name not in existing:
                db.session.execute(text(
                    f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}"
                ))
    db.session.commit()
