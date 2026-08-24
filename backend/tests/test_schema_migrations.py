from sqlalchemy import inspect, text

from models import db
from services.schema import RUNTIME_SCHEMA_COLUMNS, ensure_runtime_schema


def test_assignment_runtime_columns_from_all_feature_groups_are_merged():
    assert set(RUNTIME_SCHEMA_COLUMNS["assignments"]) == {
        "material_id",
        "include_workbook",
        "target_student_ids",
        "assignment_kind",
    }


def test_runtime_schema_repairs_legacy_assignment_table(app):
    with app.app_context():
        db.session.execute(text(
            "ALTER TABLE assignments DROP COLUMN target_student_ids"
        ))
        db.session.execute(text(
            "ALTER TABLE assignments DROP COLUMN assignment_kind"
        ))
        db.session.commit()

        before = {
            column["name"] for column in inspect(db.engine).get_columns("assignments")
        }
        assert "target_student_ids" not in before
        assert "assignment_kind" not in before

        ensure_runtime_schema()

        after = {
            column["name"] for column in inspect(db.engine).get_columns("assignments")
        }
        assert "target_student_ids" in after
        assert "assignment_kind" in after
