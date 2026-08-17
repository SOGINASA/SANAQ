import os
import sys
from pathlib import Path

import pytest
from flask_jwt_extended import create_access_token


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("FLASK_ENV", "testing")

from app import create_app
from config import TestingConfig
from models import User, db
from services.seed import seed_demo_data


@pytest.fixture
def app():
    application = create_app(TestingConfig)
    with application.app_context():
        db.create_all()
        seed_demo_data()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def create_user(app):
    def factory(email="student@example.com", role="student", password="password123"):
        user = User(email=email, name="Test User", role=role, locale="ru")
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user
    return factory


@pytest.fixture
def student(create_user):
    return create_user()


@pytest.fixture
def admin(create_user):
    return create_user(email="admin@example.com", role="admin")


@pytest.fixture
def teacher(create_user):
    return create_user(email="teacher@example.com", role="teacher")


@pytest.fixture
def student_headers(app, student):
    token = create_access_token(identity=student.id, additional_claims={"role": student.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(app, admin):
    token = create_access_token(identity=admin.id, additional_claims={"role": admin.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def teacher_headers(app, teacher):
    token = create_access_token(identity=teacher.id, additional_claims={"role": teacher.role})
    return {"Authorization": f"Bearer {token}"}
