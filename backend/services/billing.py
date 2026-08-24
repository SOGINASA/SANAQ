from datetime import timedelta
import secrets

from flask import current_app

from models import Payment, Subscription, db, utc_now


PLANS = (
    {
        "id": "start",
        "name": {"ru": "Старт", "kk": "Бастау", "en": "Start"},
        "description": {
            "ru": "Персональный маршрут и все уроки по школьной программе.",
            "kk": "Жеке бағыт және мектеп бағдарламасындағы барлық сабақ.",
            "en": "A personal learning path and every curriculum lesson.",
        },
        "features": {
            "ru": ["Диагностика знаний", "Персональный маршрут", "PDF-воркбуки"],
            "kk": ["Білім диагностикасы", "Жеке бағыт", "PDF воркбуктер"],
            "en": ["Knowledge diagnostic", "Personal learning path", "PDF workbooks"],
        },
        "amount_tiyn": 100,
        "duration_days": 30,
        "recommended": False,
    },
    {
        "id": "sana",
        "name": {"ru": "SANA", "kk": "SANA", "en": "SANA"},
        "description": {
            "ru": "Маршрут, воркбуки и персональный AI-ассистент.",
            "kk": "Бағыт, воркбуктер және жеке AI-көмекші.",
            "en": "Learning path, workbooks, and a personal AI tutor.",
        },
        "features": {
            "ru": ["Всё из тарифа Старт", "Ассистент SANA", "Адаптивные объяснения"],
            "kk": ["Бастау тарифінің барлығы", "SANA көмекшісі", "Бейімделетін түсіндіру"],
            "en": ["Everything in Start", "SANA assistant", "Adaptive explanations"],
        },
        "amount_tiyn": 100,
        "duration_days": 30,
        "recommended": True,
    },
    {
        "id": "max",
        "name": {"ru": "Максимум", "kk": "Максимум", "en": "Maximum"},
        "description": {
            "ru": "Полный учебный контур с классом и аналитикой прогресса.",
            "kk": "Сынып және прогресс талдауы бар толық оқу жүйесі.",
            "en": "The complete learning experience with class and progress analytics.",
        },
        "features": {
            "ru": ["Всё из тарифа SANA", "Задания от учителя", "Расширенная аналитика"],
            "kk": ["SANA тарифінің барлығы", "Мұғалім тапсырмалары", "Кеңейтілген талдау"],
            "en": ["Everything in SANA", "Teacher assignments", "Extended analytics"],
        },
        "amount_tiyn": 100,
        "duration_days": 30,
        "recommended": False,
    },
)


def plan_by_id(plan_id):
    return next((plan for plan in PLANS if plan["id"] == plan_id), None)


def public_plans():
    return [dict(plan) for plan in PLANS]


def create_payment(user_id, plan_id, idempotency_key):
    plan = plan_by_id(plan_id)
    if not plan:
        raise ValueError("PLAN_NOT_FOUND")

    existing = db.session.scalar(
        db.select(Payment).where(
            Payment.user_id == user_id,
            Payment.idempotency_key == idempotency_key,
        )
    )
    if existing:
        return existing, False

    mode = current_app.config["KASPI_PAYMENT_MODE"]
    if mode not in {"demo", "kaspi_link"}:
        raise RuntimeError("PAYMENT_MODE_INVALID")
    if mode == "demo" and not current_app.config["KASPI_ALLOW_DEMO_CHECKOUT"]:
        raise RuntimeError("DEMO_CHECKOUT_DISABLED")
    if mode == "kaspi_link" and not current_app.config["KASPI_PAYMENT_URL"]:
        raise RuntimeError("KASPI_NOT_CONFIGURED")

    payment = Payment(
        user_id=user_id,
        plan_id=plan_id,
        provider=current_app.config["PAYMENT_PROVIDER"],
        provider_mode=mode,
        provider_reference=f"SANAQ-{secrets.token_hex(5).upper()}",
        amount_tiyn=plan["amount_tiyn"],
        currency="KZT",
        status="pending",
        idempotency_key=idempotency_key,
    )
    db.session.add(payment)
    db.session.flush()
    payment.checkout_url = (
        f"{current_app.config['FRONTEND_URL']}/student/billing/demo/{payment.id}"
        if mode == "demo"
        else current_app.config["KASPI_PAYMENT_URL"]
    )
    db.session.commit()
    return payment, True


def activate_payment(payment, actor_id=None):
    if payment.status == "paid":
        return current_subscription(payment.user_id)
    if payment.status != "pending":
        raise ValueError("PAYMENT_NOT_PENDING")

    now = utc_now()
    plan = plan_by_id(payment.plan_id)
    subscription = db.session.scalar(
        db.select(Subscription).where(Subscription.user_id == payment.user_id)
    )
    if subscription is None:
        subscription = Subscription(
            user_id=payment.user_id,
            plan_id=payment.plan_id,
            payment_id=payment.id,
            starts_at=now,
            expires_at=now + timedelta(days=plan["duration_days"]),
        )
        db.session.add(subscription)
    else:
        base = subscription.expires_at
        if base.tzinfo is None:
            base = base.replace(tzinfo=now.tzinfo)
        if base < now:
            base = now
        subscription.plan_id = payment.plan_id
        subscription.payment_id = payment.id
        subscription.status = "active"
        subscription.starts_at = now
        subscription.expires_at = base + timedelta(days=plan["duration_days"])

    payment.status = "paid"
    payment.paid_at = now
    db.session.commit()
    return subscription


def cancel_payment(payment):
    if payment.status == "paid":
        raise ValueError("PAYMENT_ALREADY_PAID")
    if payment.status != "cancelled":
        payment.status = "cancelled"
        payment.cancelled_at = utc_now()
        db.session.commit()
    return payment


def current_subscription(user_id):
    subscription = db.session.scalar(
        db.select(Subscription).where(Subscription.user_id == user_id)
    )
    if subscription and subscription.status == "active":
        expires_at = subscription.expires_at
        now = utc_now()
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=now.tzinfo)
        if expires_at <= now:
            subscription.status = "expired"
            db.session.commit()
    return subscription
