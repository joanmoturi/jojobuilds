import calendar
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models as m
from . import schemas as s
from .auth import Context, audit, context, property_ids, require, scoped_property, scoped_tenancy
from .db import get_db
from .ledger import local_today, lock_org
from .routes_core import visible_tenancies

router = APIRouter(prefix="/api/v1", tags=["providers and owner finances"])
PRIVATE_KINDS = {"tax", "loan", "owner_use"}


def provider_access(ctx: Context):
    if ctx.member.role not in ("owner", "manager", "finance", "caretaker", "maintenance"):
        raise HTTPException(403, "Service provider contacts are restricted to authorized staff")


def provider_record(db: Session, ctx: Context, provider_id: str):
    record = db.get(m.ServiceProvider, provider_id)
    if not record or record.org_id != ctx.org.id:
        raise HTTPException(404, "Service provider not found")
    return record


def payable_query(db: Session, ctx: Context):
    require(ctx, "finance")
    query = select(m.Payable).where(m.Payable.org_id == ctx.org.id)
    if ctx.member.role != "owner":
        query = query.where(
            m.Payable.kind.in_(("service", "operating")),
            m.Payable.property_id.in_(property_ids(db, ctx)),
        )
    return query


def payable_record(db: Session, ctx: Context, payable_id: str):
    record = db.scalar(payable_query(db, ctx).where(m.Payable.id == payable_id))
    if not record:
        raise HTTPException(404, "Bill or owner obligation not found")
    return record


def payment_total(db: Session, payable_id: str):
    return db.scalar(
        select(func.coalesce(func.sum(m.OutgoingPayment.amount), 0)).where(
            m.OutgoingPayment.payable_id == payable_id,
            m.OutgoingPayment.reversed_at.is_(None),
        )
    )


def payable_view(db: Session, ctx: Context, record: m.Payable):
    payments = db.scalars(
        select(m.OutgoingPayment)
        .where(m.OutgoingPayment.payable_id == record.id)
        .order_by(m.OutgoingPayment.paid_on.desc(), m.OutgoingPayment.created_at.desc())
    ).all()
    current = [p for p in payments if not p.reversed_at]
    paid = sum(p.amount for p in current)
    balance = 0 if record.voided_at else record.amount - paid
    prop = db.get(m.Property, record.property_id) if record.property_id else None
    provider = db.get(m.ServiceProvider, record.provider_id) if record.provider_id else None
    return dict(
        id=record.id,
        kind=record.kind,
        property_id=record.property_id,
        property_name=prop.name if prop else None,
        provider_id=record.provider_id,
        provider_name=provider.name if provider else None,
        maintenance_id=record.maintenance_id,
        description=record.description,
        reference=record.reference,
        amount=record.amount,
        paid=paid,
        balance=balance,
        issued_on=record.issued_on,
        due_date=record.due_date,
        last_paid_on=max((p.paid_on for p in current), default=None),
        overdue=balance > 0 and record.due_date < local_today(ctx),
        voided_at=record.voided_at.isoformat() if record.voided_at else None,
        void_reason=record.void_reason,
        payments=[
            dict(
                id=p.id,
                amount=p.amount,
                paid_on=p.paid_on,
                method=p.method,
                reference=p.reference,
                reversed_at=p.reversed_at.isoformat() if p.reversed_at else None,
                reversal_reason=p.reversal_reason,
            )
            for p in payments
        ],
    )


@router.get("/providers", response_model=list[s.ProviderOut])
def providers(ctx: Context = Depends(context), db: Session = Depends(get_db)):
    provider_access(ctx)
    financial = ctx.member.role in ("owner", "finance")
    result = []
    for provider in db.scalars(
        select(m.ServiceProvider)
        .where(m.ServiceProvider.org_id == ctx.org.id)
        .order_by(m.ServiceProvider.name)
        .limit(500)
    ):
        billed = paid = last_paid = None
        if financial:
            bills = payable_query(db, ctx).where(
                m.Payable.provider_id == provider.id, m.Payable.voided_at.is_(None)
            )
            ids = bills.with_only_columns(m.Payable.id)
            billed = db.scalar(
                select(func.coalesce(func.sum(m.Payable.amount), 0)).where(m.Payable.id.in_(ids))
            )
            paid, last_paid = db.execute(
                select(
                    func.coalesce(func.sum(m.OutgoingPayment.amount), 0),
                    func.max(m.OutgoingPayment.paid_on),
                ).where(
                    m.OutgoingPayment.payable_id.in_(ids),
                    m.OutgoingPayment.reversed_at.is_(None),
                )
            ).one()
        result.append(
            dict(
                id=provider.id,
                portal_access=db.scalar(
                    select(m.ProviderAccess.id).where(
                        m.ProviderAccess.provider_id == provider.id,
                        m.ProviderAccess.active.is_(True),
                    )
                )
                is not None,
                **{field: getattr(provider, field) for field in s.ProviderIn.model_fields},
                billed=billed,
                paid=paid,
                balance=billed - paid if financial else None,
                last_paid_on=last_paid,
            )
        )
    return result


@router.post("/providers", status_code=201)
def create_provider(
    data: s.ProviderIn, ctx: Context = Depends(context), db: Session = Depends(get_db)
):
    require(ctx, "manage")
    record = m.ServiceProvider(org_id=ctx.org.id, **data.model_dump())
    db.add(record)
    db.flush()
    audit(db, ctx, "provider.created", record.id)
    return {"id": record.id}


@router.put("/providers/{provider_id}")
def update_provider(
    provider_id: str,
    data: s.ProviderIn,
    ctx: Context = Depends(context),
    db: Session = Depends(get_db),
):
    require(ctx, "manage")
    record = provider_record(db, ctx, provider_id)
    for field, value in data.model_dump().items():
        if field == "email" and value.lower() != record.email.lower():
            link = db.scalar(
                select(m.ProviderAccess).where(
                    m.ProviderAccess.provider_id == provider_id, m.ProviderAccess.active.is_(True)
                )
            )
            if link:
                raise HTTPException(409, "Revoke provider access before changing the sign-in email")
        setattr(record, field, value)
    audit(db, ctx, "provider.updated", record.id)
    return {"id": record.id}


@router.get("/payables", response_model=list[s.PayableOut])
def payables(ctx: Context = Depends(context), db: Session = Depends(get_db)):
    return [
        payable_view(db, ctx, record)
        for record in db.scalars(
            payable_query(db, ctx)
            .order_by(m.Payable.due_date.desc(), m.Payable.created_at.desc())
            .limit(1000)
        )
    ]


@router.post("/payables", status_code=201, response_model=s.PayableOut)
def create_payable(
    data: s.PayableIn, ctx: Context = Depends(context), db: Session = Depends(get_db)
):
    require(ctx, "finance")
    if data.kind in PRIVATE_KINDS and ctx.member.role != "owner":
        raise HTTPException(403, "Taxes, loans and owner use are private to the owner")
    lock_org(db, ctx)
    existing = db.scalar(
        payable_query(db, ctx).where(m.Payable.idempotency_key == data.idempotency_key)
    )
    if existing:
        if any(getattr(existing, field) != value for field, value in data.model_dump().items()):
            raise HTTPException(409, "Idempotency key already used for a different bill")
        return payable_view(db, ctx, existing)
    if data.property_id:
        scoped_property(db, ctx, data.property_id)
    if data.issued_on > local_today(ctx):
        raise HTTPException(422, "An issue date cannot be in the future")
    if data.provider_id:
        provider = provider_record(db, ctx, data.provider_id)
        if not provider.active:
            raise HTTPException(422, "Choose an active service provider")
    if data.maintenance_id:
        job = db.get(m.Maintenance, data.maintenance_id)
        if not job or job.org_id != ctx.org.id or job.property_id != data.property_id:
            raise HTTPException(422, "Maintenance job does not match this property")
        if job.provider_id and job.provider_id != data.provider_id:
            raise HTTPException(422, "Maintenance job is assigned to a different provider")
    if (
        data.provider_id
        and data.reference
        and db.scalar(
            select(m.Payable.id).where(
                m.Payable.org_id == ctx.org.id,
                m.Payable.provider_id == data.provider_id,
                m.Payable.reference == data.reference,
                m.Payable.voided_at.is_(None),
            )
        )
    ):
        raise HTTPException(409, "This provider invoice reference is already recorded")
    record = m.Payable(org_id=ctx.org.id, created_by=ctx.user.id, **data.model_dump())
    db.add(record)
    db.flush()
    audit(db, ctx, "payable.created", record.id, kind=record.kind, amount=record.amount)
    return payable_view(db, ctx, record)


@router.post("/payables/{payable_id}/payments", response_model=s.PayableOut)
def pay_payable(
    payable_id: str,
    data: s.OutgoingPaymentIn,
    ctx: Context = Depends(context),
    db: Session = Depends(get_db),
):
    require(ctx, "finance")
    lock_org(db, ctx)
    record = payable_record(db, ctx, payable_id)
    existing = db.scalar(
        select(m.OutgoingPayment).where(
            m.OutgoingPayment.org_id == ctx.org.id,
            m.OutgoingPayment.idempotency_key == data.idempotency_key,
        )
    )
    if existing:
        if existing.payable_id != record.id or any(
            getattr(existing, field) != value for field, value in data.model_dump().items()
        ):
            raise HTTPException(
                409, "Idempotency key already used for a different outgoing payment"
            )
        return payable_view(db, ctx, record)
    if record.voided_at:
        raise HTTPException(409, "Cannot pay a voided bill")
    if data.paid_on > local_today(ctx) or data.paid_on < record.issued_on:
        raise HTTPException(422, "Payment date must be between the issue date and today")
    if data.amount > record.amount - payment_total(db, record.id):
        raise HTTPException(422, "Payment exceeds the outstanding bill amount")
    payment = m.OutgoingPayment(
        org_id=ctx.org.id,
        payable_id=record.id,
        created_by=ctx.user.id,
        **data.model_dump(),
    )
    db.add(payment)
    db.flush()
    audit(db, ctx, "outgoing_payment.recorded", payment.id, amount=payment.amount)
    return payable_view(db, ctx, record)


@router.post("/payables/{payable_id}/void")
def void_payable(
    payable_id: str, data: s.Reason, ctx: Context = Depends(context), db: Session = Depends(get_db)
):
    require(ctx, "finance")
    lock_org(db, ctx)
    record = payable_record(db, ctx, payable_id)
    if record.voided_at or payment_total(db, record.id):
        raise HTTPException(
            409, "Only an unpaid, non-voided bill can be voided; reverse payments first"
        )
    record.voided_at = m.now()
    record.void_reason = data.reason
    audit(db, ctx, "payable.voided", record.id, reason=data.reason)
    return {"ok": True}


@router.post("/outgoing-payments/{payment_id}/reverse")
def reverse_outgoing(
    payment_id: str, data: s.Reason, ctx: Context = Depends(context), db: Session = Depends(get_db)
):
    require(ctx, "finance")
    lock_org(db, ctx)
    payment = db.get(m.OutgoingPayment, payment_id)
    if not payment or payment.org_id != ctx.org.id:
        raise HTTPException(404, "Outgoing payment not found")
    payable_record(db, ctx, payment.payable_id)
    if payment.reversed_at:
        raise HTTPException(409, "Outgoing payment is already reversed")
    payment.reversed_at = m.now()
    payment.reversal_reason = data.reason
    audit(db, ctx, "outgoing_payment.reversed", payment.id, reason=data.reason)
    return {"ok": True}


@router.get("/recurring-charges", response_model=list[s.RecurringChargeOut])
def recurring_charges(ctx: Context = Depends(context), db: Session = Depends(get_db)):
    if ctx.member.role != "tenant":
        require(ctx, "finance")
    return list(
        db.scalars(
            select(m.RecurringCharge).where(
                m.RecurringCharge.tenancy_id.in_([t.id for t in visible_tenancies(db, ctx)])
            )
        )
    )


@router.post("/recurring-charges", status_code=201)
def create_recurring(
    data: s.RecurringChargeIn, ctx: Context = Depends(context), db: Session = Depends(get_db)
):
    require(ctx, "finance")
    lock_org(db, ctx)
    scoped_tenancy(db, ctx, data.tenancy_id)
    record = m.RecurringCharge(org_id=ctx.org.id, **data.model_dump())
    db.add(record)
    db.flush()
    audit(db, ctx, "recurring_charge.created", record.id, amount=record.amount)
    return {"id": record.id}


@router.put("/recurring-charges/{rule_id}")
def update_recurring(
    rule_id: str,
    data: s.RecurringChargeIn,
    ctx: Context = Depends(context),
    db: Session = Depends(get_db),
):
    require(ctx, "finance")
    lock_org(db, ctx)
    record = db.get(m.RecurringCharge, rule_id)
    if not record or record.org_id != ctx.org.id:
        raise HTTPException(404, "Recurring charge not found")
    scoped_tenancy(db, ctx, record.tenancy_id)
    if (record.tenancy_id, record.kind) != (data.tenancy_id, data.kind):
        raise HTTPException(422, "A recurring rule cannot be moved to a different tenancy or type")
    before = {field: getattr(record, field) for field in s.RecurringChargeIn.model_fields}
    for field, value in data.model_dump().items():
        setattr(record, field, value)
    audit(db, ctx, "recurring_charge.updated", record.id, before=before, after=data.model_dump())
    return {"id": record.id}


@router.get("/owner-finances", response_model=s.OwnerFinanceOut)
def owner_finances(
    period: str = Query(pattern=r"^(20\d{2}|2100)-(0[1-9]|1[0-2])$"),
    ctx: Context = Depends(context),
    db: Session = Depends(get_db),
):
    if ctx.member.role != "owner":
        raise HTTPException(403, "Owner finances are private to the owner")
    year, month = map(int, period.split("-"))
    first, last = date(year, month, 1), date(year, month, calendar.monthrange(year, month)[1])
    inflows = db.scalar(
        select(func.coalesce(func.sum(m.Payment.amount), 0)).where(
            m.Payment.org_id == ctx.org.id,
            m.Payment.purpose == "rent",
            m.Payment.reversed_at.is_(None),
            m.Payment.received_on.between(first, last),
        )
    )
    outgoing = dict(
        db.execute(
            select(m.Payable.kind, func.sum(m.OutgoingPayment.amount))
            .join(m.OutgoingPayment, m.OutgoingPayment.payable_id == m.Payable.id)
            .where(
                m.Payable.org_id == ctx.org.id,
                m.Payable.voided_at.is_(None),
                m.OutgoingPayment.reversed_at.is_(None),
                m.OutgoingPayment.paid_on.between(first, last),
            )
            .group_by(m.Payable.kind)
        ).all()
    )
    balances = [
        (bill.due_date, bill.amount - payment_total(db, bill.id))
        for bill in db.scalars(payable_query(db, ctx).where(m.Payable.voided_at.is_(None)))
    ]
    return dict(
        period=period,
        inflows=inflows,
        **{
            f"{kind}_paid": outgoing.get(kind, 0)
            for kind in ("service", "operating", "tax", "loan", "owner_use")
        },
        net_movement=inflows - sum(outgoing.values()),
        outstanding=sum(balance for _, balance in balances),
        overdue=sum(balance for due, balance in balances if due < local_today(ctx)),
    )
