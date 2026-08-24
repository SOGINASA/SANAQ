import re
from urllib.parse import urlsplit

from models import LearningModule, Lesson, Task, db
from services.lesson_guides import build_lesson_guide


def _pdf_page_count(payload):
    return len(re.findall(rb"/Type\s*/Page(?!s)", payload))


def test_lesson_exposes_structured_guide_and_five_page_workbook(
    client, student_headers,
):
    lesson_response = client.get(
        "/api/v1/lessons/lesson-factoring", headers=student_headers,
    )
    assert lesson_response.status_code == 200
    guide = lesson_response.get_json()["data"]["lesson"]["guide"]
    assert guide["version"] == "lesson-guide-v1"
    assert guide["workbook"]["pages"] == 5
    assert len(guide["sections"]) == 3
    assert len(guide["examples"]) >= 1
    assert len(guide["practice"]) >= 3
    assert guide["practice"][0]["answer"] == "4a(2a + 3)"

    workbook = client.get(
        "/api/v1/lessons/lesson-factoring/workbook.pdf", headers=student_headers,
    )
    assert workbook.status_code == 200
    assert workbook.mimetype == "application/pdf"
    assert workbook.data.startswith(b"%PDF")
    assert _pdf_page_count(workbook.data) == 5
    assert workbook.headers["X-Workbook-Version"] == "workbook-v1"
    assert "attachment" in workbook.headers["Content-Disposition"]


def test_every_curriculum_topic_has_a_complete_print_ready_lesson(app):
    modules = db.session.scalars(
        db.select(LearningModule)
        .where(LearningModule.subject_id == "mathematics", LearningModule.id.like("module-math-g%"))
        .order_by(LearningModule.grade, LearningModule.id)
    ).all()
    assert len(modules) == 60

    for module in modules:
        lesson = db.session.scalar(
            db.select(Lesson).where(Lesson.module_id == module.id)
        )
        assert lesson is not None, module.id
        guide = build_lesson_guide(module, lesson, locale="ru")
        assert len(guide["objectives"]) >= 3, module.id
        assert len(guide["sections"]) == 3, module.id
        assert len(guide["examples"]) >= 3, module.id
        assert len(guide["practice"]) >= 6, module.id
        assert all(item["task_id"] is None for item in guide["practice"][:6]), module.id
        assert all("Какой навык соответствует" not in item["prompt"] for item in guide["practice"][:6]), module.id
        assert all(item["answer"] for item in guide["practice"][:6]), module.id
        assert guide["workbook"]["pages"] == 5, module.id


def test_every_online_curriculum_task_uses_authored_mathematics_content(app):
    modules = db.session.scalars(
        db.select(LearningModule)
        .where(LearningModule.subject_id == "mathematics", LearningModule.id.like("module-math-g%"))
    ).all()
    assert len(modules) == 60

    for module in modules:
        lesson = db.session.scalar(db.select(Lesson).where(Lesson.module_id == module.id))
        tasks = db.session.scalars(
            db.select(Task).where(Task.lesson_id == lesson.id).order_by(Task.id)
        ).all()
        guide = build_lesson_guide(module, lesson, tasks=tasks, locale="ru")
        expected_prompts = {item["prompt"] for item in guide["practice"][:3]}
        actual_prompts = {task.prompt["ru"] for task in tasks}
        assert len(tasks) == 3, module.id
        assert actual_prompts == expected_prompts, module.id
        assert all("Какой навык соответствует" not in prompt for prompt in actual_prompts), module.id
        assert all(task.task_type == "short_answer" for task in tasks), module.id


def test_published_module_workbook_is_available_to_student(client, student_headers):
    workbook = client.get(
        "/api/v1/modules/module-factoring/workbook.pdf", headers=student_headers,
    )
    assert workbook.status_code == 200
    assert workbook.data.startswith(b"%PDF")
    assert _pdf_page_count(workbook.data) == 5


def test_lesson_guide_static_copy_does_not_leak_russian_into_english(
    client, student_headers,
):
    response = client.get(
        "/api/v1/lessons/lesson-factoring",
        headers={**student_headers, "Accept-Language": "en"},
    )
    guide = response.get_json()["data"]["lesson"]["guide"]
    assert guide["sections"][0]["callout"].startswith("Master the skill")
    assert guide["sections"][1]["body"] == "Given → rule → calculation → check → answer"


def test_teacher_can_attach_pdf_workbook_and_enrolled_student_can_download(
    client, teacher_headers, student_headers,
):
    classroom = client.post(
        "/api/v1/classes", headers=teacher_headers,
        json={"name": "9 Workbook", "subject_id": "mathematics", "grade": 9},
    ).get_json()["data"]["class"]
    assert client.post(
        "/api/v1/classes/join", headers=student_headers,
        json={"join_code": classroom["join_code"]},
    ).status_code == 200

    upload_response = client.post(
        "/api/v1/materials/upload-url", headers=teacher_headers,
        json={"filename": "мой-воркбук.pdf", "content_type": "application/pdf"},
    )
    assert upload_response.status_code == 201
    upload_data = upload_response.get_json()["data"]
    upload_url = urlsplit(upload_data["upload_url"])
    sample_pdf = b"%PDF-1.4\n% SANAQ teacher workbook\n%%EOF"
    assert client.put(
        f"{upload_url.path}?{upload_url.query}", data=sample_pdf,
        content_type="application/pdf",
    ).status_code == 200

    assignment_response = client.post(
        "/api/v1/assignments", headers=teacher_headers,
        json={
            "class_id": classroom["id"],
            "title": "Воркбук: разложение на множители",
            "module_id": "module-factoring",
            "material_id": upload_data["material_id"],
            "include_workbook": True,
            "status": "published",
        },
    )
    assert assignment_response.status_code == 201
    assignment = assignment_response.get_json()["data"]["assignment"]
    assert assignment["workbook"]["kind"] == "uploaded"
    assert assignment["workbook"]["filename"] == "мой-воркбук.pdf"

    downloaded = client.get(
        f"/api/v1{assignment['workbook']['download_url']}", headers=student_headers,
    )
    assert downloaded.status_code == 200
    assert downloaded.data == sample_pdf


def test_assignment_can_link_automatically_generated_workbook(
    client, teacher_headers,
):
    classroom = client.post(
        "/api/v1/classes", headers=teacher_headers,
        json={"name": "9 Generated", "subject_id": "mathematics", "grade": 9},
    ).get_json()["data"]["class"]
    response = client.post(
        "/api/v1/assignments", headers=teacher_headers,
        json={
            "class_id": classroom["id"],
            "title": "Печатная практика",
            "module_id": "module-factoring",
            "include_workbook": True,
            "status": "published",
        },
    )
    assert response.status_code == 201
    workbook = response.get_json()["data"]["assignment"]["workbook"]
    assert workbook == {
        "kind": "generated",
        "filename": "sanaq-module-factoring-workbook.pdf",
        "download_url": "/modules/module-factoring/workbook.pdf",
    }
