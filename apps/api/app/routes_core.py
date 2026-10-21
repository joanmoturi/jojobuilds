from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models as m
from . import schemas as s
from .auth import (
    Context,
    audit,
    context,
    property_ids,
    require,
    scoped_property,
    scoped_tenancy,
    utc,
)
from .db import get_db
from .ledger import allocated, charge_view, local_today, lock_org, payment_allocated
from .providers import INTEGRATIONS

router = APIRouter(prefix="/api/v1", tags=["portfolio"])


def visible_tenancies(db: Session, ctx: Context):
    query = (
        select(m.Tenancy)
        .join(m.Unit)
        .where(m.Tenancy.org_id == ctx.org.id, m.Unit.property_id.in_(property_ids(db, ctx)))
    )
    if ctx.member.role == "tenant":
        query = query.join(m.Tenant).where(m.Tenant.user_id == ctx.user.id)
    return list(db.scalars(query))


@router.get("/properties", response_model=list[s.PropertyOut])
def properties(
    q: str = Query(default="", max_length=100),
    ctx: Context = Depends(context),
    db: Session = Depends(get_db),
):
    query = select(m.Property).where(
        m.Property.id.in_(property_ids(db, ctx)), m.Property.archived.is_(False)
    )
    if q:
        query = query.where(m.Property.name.ilike(f"%{q}%"))
    result = []
    for prop in db.scalars(query.order_by(m.Property.name).limit(500)):
        units = list(db.scalars(select(m.Unit).where(m.Unit.property_id == prop.id)))
        tids = [t.id for t in visible_tenancies(db, ctx) if t.unit_id in {u.id for u in units}]
        active = db.scalars(
            select(m.Tenancy).where(m.Tenancy.id.in_(tids), m.Tenancy.status == "active")
        ).all()
        charges = db.scalars(
            select(m.Charge).where(m.Charge.tenancy_id.in_(tids), m.Charge.kind != "deposit")
        ).all()
        collected = sum(allocated(db, c.id) for c in charges)
        total = sum(c.amount for c in charges)
        show_money = ctx.member.role in ("owner", "manager", "finance", "tenant")
        result.append(
            dict(
                id=prop.id,
                name=prop.name,
                location=prop.location,
                county=prop.county,
                contact=prop.contact,
                units=len(units),
                occupied=len(active),
                billed=total if show_money else None,
                collected=collected if show_money else None,
                outstanding=total - collected if show_money else None,
            )
        )
    return result


@router.post("/properties", status_code=201)
def create_property(
    data: s.PropertyIn, ctx: Context = Depends(context), db: Session = Depends(get_db)
):
    require(ctx, "manage")
    if ctx.member.role != "owner":
        raise HTTPException(403, "Only the owner can add a property")
    prop = m.Property(org_id=ctx.org.id, **data.model_dump())
    db.add(prop)
    db.flush()
    audit(db, ctx, "property.created", prop.id)
    return {"id": prop.id}


@router.put("/properties/{property_id}")
def update_property(
    property_id: str,
    data: s.PropertyIn,
    ctx: Context = Depends(context),
    db: Session = Depends(get_db),
):
    require(ctx, "manage")
    prop = scoped_property(db, ctx, property_id)
    if data.archived:
        active = db.scalar(
            select(m.Tenancy.id)
            .join(m.Unit)
            .where(m.Unit.property_id == prop.id, m.Tenancy.status == "active")
        )
        if active:
            raise HTTPException(409, "End active tenancies before archiving a property")
    for key, value in data.model_dump().items():
        setattr(prop, key, value)
    audit(db, ctx, "property.updated", prop.id)
    return {"id": prop.id}


@router.get("/units", response_model=list[s.UnitOut])
def units(
    property_id: str | None = None, ctx: Context = Depends(context), db: Session = Depends(get_db)
):
    query = select(m.Unit).where(m.Unit.property_id.in_(property_ids(db, ctx)))
    if property_id:
        scoped_property(db, ctx, property_id)
        query = query.where(m.Unit.property_id == property_id)
    if ctx.member.role == "tenant":
        own_units = [t.unit_id for t in visible_tenancies(db, ctx)]
        query = query.where(m.Unit.id.in_(own_units))
    active_units = {t.unit_id for t in visible_tenancies(db, ctx) if t.status == "active"}
    return [
        dict(
            id=u.id,
            property_id=u.property_id,
            number=u.number,
            building=u.building,
            floor=u.floor,
            unit_type=u.unit_type,
            default_rent=u.default_rent,
            occupied=u.id in active_units,
        )
        for u in db.scalars(query.limit(1000))
    ]


@router.post("/units", status_code=201)
def create_unit(data: s.UnitIn, ctx: Context = Depends(context), db: Session = Depends(get_db)):
    require(ctx, "manage")
    prop = scoped_property(db, ctx, data.property_id)
    if prop.archived:
        raise HTTPException(409, "Property is archived")
    unit = m.Unit(org_id=ctx.org.id, **data.model_dump())
    db.add(unit)
    db.flush()
    audit(db, ctx, "unit.created", unit.id)
    return {"id": unit.id}


@router.get("/tenants", response_model=list[s.TenantOut])
def tenants(
    q: str = Query(default="", max_length=100),
    ctx: Context = Depends(context),
    db: Session = Depends(get_db),
):
    if ctx.member.role in ("caretaker", "maintenance"):
        raise HTTPException(403, "Use maintenance requests and designated property contacts")
    tenancies = visible_tenancies(db, ctx)
    ids = {t.tenant_id for t in tenancies}
    query = select(m.Tenant).where(m.Tenant.org_id == ctx.org.id)
    if ctx.member.role != "owner":
        query = query.where(m.Tenant.id.in_(ids))
    if q:
        query = query.where(m.Tenant.name.ilike(f"%{q}%"))
    return [
        dict(
            id=t.id,
            name=t.name,
            email=t.email,
            phone=t.phone,
            emergency_contact=t.emergency_contact,
            linked=t.user_id is not None,
        )
        for t in db.scalars(query.order_by(m.Tenant.name).limit(1000))
    ]


@router.post("/tenants", status_code=201)
def create_tenant(data: s.TenantIn, ctx: Context = Depends(context), db: Session = Depends(get_db)):
    require(ctx, "tenant_manage")
    tenant = m.Tenant(org_id=ctx.org.id, **data.model_dump())
    db.add(tenant)
    db.flush()
    audit(db, ctx, "tenant.created", tenant.id)
    return {"id": tenant.id}


@router.get("/tenancies", response_model=list[s.TenancyOut])
def tenancies(ctx: Context = Depends(context), db: Session = Depends(get_db)):
    if ctx.member.role in ("caretaker", "maintenance"):
        raise HTTPException(403, "Financial tenancy records are restricted")
    return [
        dict(
            id=t.id,
            unit_id=t.unit_id,
            tenant_id=t.tenant_id,
            reference=t.reference,
            rent=t.rent,
            deposit=t.deposit,
            due_day=t.due_day,
            start_date=t.start_date,
            end_date=t.end_date,
            status=t.status,
        )
        for t in visible_tenancies(db, ctx)
    ]


@router.post("/tenancies", status_code=201)
def create_tenancy(
    data: s.TenancyIn, ctx: Context = Depends(context), db: Session = Depends(get_db)
):
    require(ctx, "tenant_manage")
    lock_org(db, ctx)
    unit = db.get(m.Unit, data.unit_id)
    if not unit or unit.org_id != ctx.org.id:
        raise HTTPException(404, "Unit not found")
    scoped_property(db, ctx, unit.property_id)
    tenant = db.get(m.Tenant, data.tenant_id)
    if not tenant or tenant.org_id != ctx.org.id:
        raise HTTPException(404, "Tenant not found")
    conflicts = db.scalar(
        select(m.Tenancy.id).where(
            m.Tenancy.unit_id == unit.id,
            (m.Tenancy.end_date.is_(None)) | (m.Tenancy.end_date >= data.start_date),
            m.Tenancy.start_date <= (data.end_date or date(9999, 12, 31)),
        )
    )
    if conflicts:
        raise HTTPException(409, "This unit already has a tenancy in that date range")
    tenancy = m.Tenancy(org_id=ctx.org.id, **data.model_dump())
    tenancy.reference = tenancy.reference.upper()
    db.add(tenancy)
    db.flush()
    audit(db, ctx, "tenancy.created", tenancy.id)
    return {"id": tenancy.id}


@router.post("/tenancies/{tenancy_id}/end")
def end_tenancy(
    tenancy_id: str,
    data: s.EndTenancy,
    ctx: Context = Depends(context),
    db: Session = Depends(get_db),
):
    require(ctx, "tenant_manage")
    lock_org(db, ctx)
    tenancy = scoped_tenancy(db, ctx, tenancy_id)
    if data.end_date < tenancy.start_date or data.end_date > local_today(ctx):
        raise HTTPException(422, "Use an end date between the tenancy start and today")
    tenancy.status = "ended"
    tenancy.end_date = data.end_date
    audit(db, ctx, "tenancy.ended", tenancy.id, reason=data.reason)
    return {"ok": True}


@router.get("/dashboard", response_model=s.DashboardOut)
def dashboard(
    period: str = Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    ctx: Context = Depends(context),
    db: Session = Depends(get_db),
):
    if ctx.member.role in ("caretaker", "maintenance", "agent"):
        raise HTTPException(
            403, "Financial dashboard is restricted to owner, manager, finance and tenants"
        )
    ids = [t.id for t in visible_tenancies(db, ctx)]
    charges = db.scalars(
        select(m.Charge).where(m.Charge.tenancy_id.in_(ids), m.Charge.kind != "deposit")
    ).all()
    period_charges = [c for c in charges if c.period == period]
    all_payments = db.scalars(
        select(m.Payment).where(m.Payment.tenancy_id.in_(ids), m.Payment.reversed_at.is_(None))
    ).all()
    balances = [charge_view(db, c, local_today(ctx)) for c in charges]
    props = property_ids(db, ctx)
    unit_rows = db.scalars(select(m.Unit).where(m.Unit.property_id.in_(props))).all()
    if ctx.member.role == "tenant":
        own = {t.unit_id for t in visible_tenancies(db, ctx)}
        unit_rows = [u for u in unit_rows if u.id in own]
    batches = (
        db.scalars(
            select(m.ImportBatch)
            .where(m.ImportBatch.org_id == ctx.org.id, m.ImportBatch.property_id.in_(props))
            .order_by(m.ImportBatch.created_at.desc())
        ).all()
        if ctx.member.role != "tenant"
        else []
    )
    pending = db.scalars(
        select(m.ImportedTransaction).where(
            m.ImportedTransaction.batch_id.in_([b.id for b in batches]),
            m.ImportedTransaction.status.in_(["review", "duplicate_review", "deferred"]),
        )
    ).all()
    maintenance = db.scalars(
        select(m.Maintenance).where(
            m.Maintenance.property_id.in_(props),
            m.Maintenance.status.not_in(["closed", "resolved"]),
        )
    ).all()
    if ctx.member.role == "tenant":
        maintenance = [r for r in maintenance if r.tenancy_id in ids]
    return dict(
        period=period,
        currency=ctx.org.currency,
        properties=len(props),
        units=len(unit_rows),
        occupied=len([t for t in visible_tenancies(db, ctx) if t.status == "active"]),
        billed=sum(c.amount for c in period_charges),
        allocated=sum(allocated(db, c.id) for c in period_charges),
        outstanding=sum(b["balance"] for b in balances),
        overdue=sum(b["balance"] for b in balances if b["overdue"]),
        cash_received=sum(
            p.amount
            for p in all_payments
            if str(p.received_on).startswith(period) and p.purpose == "rent"
        ),
        unallocated_credit=sum(
            p.amount - payment_allocated(db, p.id) for p in all_payments if p.purpose == "rent"
        ),
        pending_review=len(pending),
        maintenance_open=len(maintenance),
        last_import=batches[0].created_at.isoformat() if batches else None,
        statement_refresh_due=not batches
        or (m.now() - utc(batches[0].created_at)).total_seconds() >= 72 * 3600,
        demo=ctx.org.demo,
    )


@router.get("/integrations")
def integrations(ctx: Context = Depends(context)):
    return INTEGRATIONS


@router.get("/audit")
def audit_history(ctx: Context = Depends(context), db: Session = Depends(get_db)):
    require(ctx, "invite")
    return db.scalars(
        select(m.Audit)
        .where(m.Audit.org_id == ctx.org.id)
        .order_by(m.Audit.created_at.desc())
        .limit(200)
    ).all()
