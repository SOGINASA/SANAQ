from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from models import AuditLog, Payment, User, db
from services.billing import activate_payment, cancel_payment, create_payment, current_subscription, plan_by_id, public_plans
from utils.decorators import admin_required
from utils.responses import api_error, success


billing_bp = Blueprint("billing", __name__)


def _payment_payload(payment):
    payload = payment.to_dict()
    payload["plan"] = plan_by_id(payment.plan_id)
    payload["instructions"] = {
        "amount_tiyn": payment.amount_tiyn,
        "reference": payment.provider_reference,
        "requires_manual_confirmation": False,
    }
    return payload


@billing_bp.get("/billing/plans")
def list_plans():
    return success({"items": public_plans(), "currency": "KZT", "symbolic_mvp_price": True})


@billing_bp.get("/billing/subscription")
@jwt_required(locations=["headers"])
def get_subscription():
    subscription = current_subscription(get_jwt_identity())
    return success({
        "subscription": subscription.to_dict() if subscription else None,
        "plan": plan_by_id(subscription.plan_id) if subscription else None,
    })


@billing_bp.post("/billing/payments")
@jwt_required(locations=["headers"])
def start_payment():
    data = request.get_json(silent=True) or {}
    plan_id = str(data.get("plan_id", "")).strip().lower()
    idempotency_key = str(request.headers.get("Idempotency-Key") or data.get("idempotency_key") or "").strip()
    if not plan_by_id(plan_id):
        return api_error("PLAN_NOT_FOUND", "Тариф не найден", 404)
    if not 8 <= len(idempotency_key) <= 100:
        return api_error("IDEMPOTENCY_KEY_REQUIRED", "Укажите ключ идемпотентности", 422)
    payment, created = create_payment(get_jwt_identity(), plan_id, idempotency_key)
    return success({"payment": _payment_payload(payment)}, status=201 if created else 200)


@billing_bp.get("/billing/payments/<paymentId>")
@jwt_required(locations=["headers"])
def get_payment(paymentId):
    payment = db.session.get(Payment, paymentId)
    if not payment or payment.user_id != get_jwt_identity():
        return api_error("PAYMENT_NOT_FOUND", "Платёж не найден", 404)
    return success({"payment": _payment_payload(payment)})


@billing_bp.post("/billing/payments/<paymentId>/demo-confirm")
@jwt_required(locations=["headers"])
def confirm_demo_payment(paymentId):
    payment = db.session.get(Payment, paymentId)
    if not payment or payment.user_id != get_jwt_identity():
        return api_error("PAYMENT_NOT_FOUND", "Платёж не найден", 404)
    if payment.provider_mode != "demo":
        return api_error("DEMO_CHECKOUT_DISABLED", "Demo checkout отключён", 403)
    try:
        subscription = activate_payment(payment)
    except ValueError as error:
        return api_error(str(error), str(error), 409)
    return success({"payment": _payment_payload(payment), "subscription": subscription.to_dict()})


@billing_bp.get("/admin/payments")
@admin_required
def admin_list_payments():
    status_filter = str(request.args.get("status", "")).strip().lower()
    query = db.select(Payment).order_by(Payment.created_at.desc())
    if status_filter in {"pending", "paid", "cancelled"}:
        query = query.where(Payment.status == status_filter)
    items = db.session.scalars(query.limit(200)).all()
    user_ids = [item.user_id for item in items]
    users = {
        user.id: user for user in db.session.scalars(
            db.select(User).where(User.id.in_(user_ids or [""]))
        ).all()
    }
    return success({"items": [
        _payment_payload(item) | {"user": users[item.user_id].to_dict() if item.user_id in users else None}
        for item in items
    ]})


@billing_bp.post("/admin/payments/<paymentId>/confirm")
@admin_required
def admin_confirm_payment(paymentId):
    payment = db.session.get(Payment, paymentId)
    if not payment:
        return api_error("PAYMENT_NOT_FOUND", "Платёж не найден", 404)
    try:
        subscription = activate_payment(payment, actor_id=get_jwt_identity())
    except ValueError as error:
        return api_error(str(error), str(error), 409)
    db.session.add(AuditLog(
        actor_id=get_jwt_identity(), action="payment.confirmed", entity_type="payment",
        entity_id=payment.id,
        details={"reference": payment.provider_reference, "amount_tiyn": payment.amount_tiyn},
    ))
    db.session.commit()
    return success({"payment": _payment_payload(payment), "subscription": subscription.to_dict()})


@billing_bp.post("/admin/payments/<paymentId>/cancel")
@admin_required
def admin_cancel_payment(paymentId):
    payment = db.session.get(Payment, paymentId)
    if not payment:
        return api_error("PAYMENT_NOT_FOUND", "Платёж не найден", 404)
    try:
        cancel_payment(payment)
    except ValueError as error:
        return api_error(str(error), str(error), 409)
    db.session.add(AuditLog(
        actor_id=get_jwt_identity(), action="payment.cancelled", entity_type="payment",
        entity_id=payment.id, details={"reference": payment.provider_reference},
    ))
    db.session.commit()
    return success({"payment": _payment_payload(payment)})
