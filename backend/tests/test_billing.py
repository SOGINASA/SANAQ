from models import Payment, Subscription, db


def test_public_plans_are_three_symbolic_one_tenge_options(client):
    response = client.get("/api/v1/billing/plans")
    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert [item["id"] for item in payload["items"]] == ["start", "sana", "max"]
    assert {item["amount_tiyn"] for item in payload["items"]} == {100}
    assert payload["symbolic_mvp_price"] is True


def test_demo_checkout_is_idempotent_and_activates_subscription(client, app, student_headers, student):
    headers = student_headers | {"Idempotency-Key": "test-checkout-one"}
    first = client.post("/api/v1/billing/payments", headers=headers, json={"plan_id": "sana"})
    second = client.post("/api/v1/billing/payments", headers=headers, json={"plan_id": "sana"})
    assert first.status_code == 201
    assert second.status_code == 200
    payment = first.get_json()["data"]["payment"]
    assert payment["id"] == second.get_json()["data"]["payment"]["id"]
    assert payment["provider_mode"] == "demo"
    assert payment["checkout_url"] == f"/student/billing/demo/{payment['id']}"

    confirmed = client.post(
        f"/api/v1/billing/payments/{payment['id']}/demo-confirm",
        headers=student_headers,
    )
    assert confirmed.status_code == 200
    assert confirmed.get_json()["data"]["payment"]["status"] == "paid"
    assert confirmed.get_json()["data"]["subscription"]["plan_id"] == "sana"
    with app.app_context():
        assert db.session.scalar(db.select(Payment)).status == "paid"
        assert db.session.scalar(db.select(Subscription)).user_id == student.id


def test_user_cannot_read_another_users_payment(client, app, student_headers, create_user):
    other = create_user(email="other-payment@example.com")
    with app.app_context():
        payment = Payment(
            user_id=other.id, plan_id="start", provider="kaspi", provider_mode="demo",
            provider_reference="SANAQ-OTHER", amount_tiyn=100, currency="KZT",
            status="pending", checkout_url="http://localhost/demo", idempotency_key="other-payment-key",
        )
        db.session.add(payment)
        db.session.commit()
        payment_id = payment.id
    response = client.get(f"/api/v1/billing/payments/{payment_id}", headers=student_headers)
    assert response.status_code == 404


def test_real_kaspi_link_never_self_confirms(client, app, student_headers):
    app.config.update(KASPI_PAYMENT_MODE="kaspi_link", KASPI_PAYMENT_URL="https://pay.kaspi.kz/pay/test")
    response = client.post(
        "/api/v1/billing/payments",
        headers=student_headers | {"Idempotency-Key": "real-link-test"},
        json={"plan_id": "max"},
    )
    assert response.status_code == 201
    payment = response.get_json()["data"]["payment"]
    assert payment["checkout_url"] == "https://pay.kaspi.kz/pay/test"
    assert payment["status"] == "pending"
    denied = client.post(
        f"/api/v1/billing/payments/{payment['id']}/demo-confirm",
        headers=student_headers,
    )
    assert denied.status_code == 403


def test_admin_can_confirm_pending_kaspi_payment(client, app, student_headers, admin_headers):
    created = client.post(
        "/api/v1/billing/payments",
        headers=student_headers | {"Idempotency-Key": "admin-confirm-test"},
        json={"plan_id": "start"},
    ).get_json()["data"]["payment"]
    response = client.post(f"/api/v1/admin/payments/{created['id']}/confirm", headers=admin_headers)
    assert response.status_code == 200
    assert response.get_json()["data"]["payment"]["status"] == "paid"
