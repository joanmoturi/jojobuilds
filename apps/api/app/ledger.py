import calendar
from datetime import date
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models as m
from .auth import Context, audit, notify, scoped_tenancy
from .db import serialize_writes


def local_today(ctx: Context):
    return m.now().astimezone(ZoneInfo(ctx.org.timezone)).date()


def lock_org(db: Session, ctx: Context):
    serialize_writes(db)
    db.scalar(select(m.Organization).where(m.Organization.id == ctx.org.id).with_for_update())


def allocated(db: Session, charge_id: str):
    return db.scalar(
        select(func.coalesce(func.sum(m.Allocation.amount), 0))
        .join(m.Payment, m.Payment.id == m.Allocation.payment_id)
        .where(m.Allocation.charge_id == charge_id, m.Payment.reversed_at.is_(None))
    )


def payment_allocated(db: Session, payment_id: str):
    return db.scalar(
        select(func.coalesce(func.sum(m.Allocation.amount), 0)).where(
            m.Allocation.payment_id == payment_id
        )
    )


def allocate_credit(db: Session, tenancy_id: str):
    payments = db.scalars(
        select(m.Payment)
        .where(m.Payment.tenancy_id == tenancy_id, m.Payment.reversed_at.is_(None))
        .order_by(m.Payment.received_on, m.Payment.id)
    ).all()
    charges = db.scalars(
        select(m.Charge)
        .where(m.Charge.tenancy_id == tenancy_id)
        .order_by(m.Charge.due_date, m.Charge.id)
    ).all()
    for payment in payments:
        available = payment.amount - payment_allocated(db, payment.id)
        for charge in charges:
            # Deposits are a separate liability and never consume rent credit.
            if charge.currency != payment.currency or (charge.kind == "deposit") != (
                payment.purpose == "deposit"
            ):
                continue
            remaining = charge.amount - allocated(db, charge.id)
            amount = min(available, remaining)
            if amount <= 0:
                continue
            existing = db.scalar(
                select(m.Allocation).where(
                    m.Allocation.payment_id == payment.id, m.Allocation.charge_id == charge.id
                )
            )
            if existing:
                existing.amount += amount
            else:
                db.add(m.Allocation(payment_id=payment.id, charge_id=charge.id, amount=amount))
            db.flush()
            available -= amount


def post_payment(db: Session, ctx: Context, data, provenance="manual"):
    lock_org(db, ctx)
    tenancy = scoped_tenancy(db, ctx, data.tenancy_id)
    if data.received_on > local_today(ctx):
        raise HTTPException(422, "A received payment cannot have a future date")
    existing = db.scalar(
        select(m.Payment).where(
            m.Payment.org_id == ctx.org.id, m.Payment.idempotency_key == data.idempotency_key
        )
    )
    if existing:
        if (
            existing.tenancy_id,
            existing.amount,
            existing.received_on,
            existing.reference,
            existing.method,
            existing.purpose,
        ) != (
            data.tenancy_id,
            data.amount,
            data.received_on,
            data.reference,
            data.method,
            data.purpose,
        ):
            raise HTTPException(409, "Idempotency key already used for a different payment")
        return existing
    payment = m.Payment(
        org_id=ctx.org.id,
        tenancy_id=tenancy.id,
        amount=data.amount,
        currency=ctx.org.currency,
        received_on=data.received_on,
        reference=data.reference,
        method=data.method,
        provenance=provenance,
        purpose=data.purpose,
        idempotency_key=data.idempotency_key,
        created_by=ctx.user.id,
    )
    db.add(payment)
    db.flush()
    allocate_credit(db, tenancy.id)
    audit(db, ctx, "payment.posted", payment.id, amount=payment.amount, provenance=provenance)
    tenant = db.get(m.Tenant, tenancy.tenant_id)
    if tenant.user_id:
        notify(
            db,
            ctx,
            "Payment recorded",
            "A payment was recorded. Open your account for details.",
            user_id=tenant.user_id,
        )
    return payment


def bill_period(db: Session, ctx: Context, period: str, tenancies: list[m.Tenancy]):
    lock_org(db, ctx)
    year, month = map(int, period.split("-"))
    if not 2000 <= year <= 2100:
        raise HTTPException(422, "Billing year must be between 2000 and 2100")
    first = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    created = 0
    skipped = 0
    for tenancy in tenancies:
        if tenancy.start_date > first or (tenancy.end_date and tenancy.end_date < first):
            skipped += 1
            continue
        components = [("rent", f"Rent for {period}", tenancy.rent, tenancy.due_day)]
        rules = db.scalars(
            select(m.RecurringCharge).where(
                m.RecurringCharge.tenancy_id == tenancy.id,
                m.RecurringCharge.active.is_(True),
                m.RecurringCharge.start_period <= period,
                (m.RecurringCharge.end_period.is_(None)) | (m.RecurringCharge.end_period >= period),
            )
        )
        components.extend((r.kind, r.description, r.amount, r.due_day) for r in rules)
        for kind, description, amount, due_day in components:
            existing = db.scalar(
                select(m.Charge).where(
                    m.Charge.tenancy_id == tenancy.id,
                    m.Charge.period == period,
                    m.Charge.kind == kind,
                )
            )
            if existing:
                continue
            charge = m.Charge(
                org_id=ctx.org.id,
                tenancy_id=tenancy.id,
                period=period,
                kind=kind,
                description=description,
                amount=amount,
                currency=ctx.org.currency,
                due_date=date(year, month, min(due_day, last_day)),
            )
            db.add(charge)
            db.flush()
            allocate_credit(db, tenancy.id)
            audit(db, ctx, "charge.created", charge.id, amount=charge.amount)
            created += 1
    return {"created": created, "skipped_partial_periods": skipped}


def charge_view(db: Session, charge: m.Charge, today: date):
    paid = allocated(db, charge.id)
    balance = charge.amount - paid
    return {
        "id": charge.id,
        "tenancy_id": charge.tenancy_id,
        "period": charge.period,
        "kind": charge.kind,
        "description": charge.description,
        "amount": charge.amount,
        "currency": charge.currency,
        "due_date": str(charge.due_date),
        "allocated": paid,
        "balance": balance,
        "overdue": balance > 0 and charge.due_date < today,
    }
