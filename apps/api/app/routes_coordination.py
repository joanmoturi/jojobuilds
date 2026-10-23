import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models as m
from . import schemas as s
from .auth import (
    Context,
    audit,
    authenticated,
    context,
    digest,
    notify,
    provider_links,
    require,
    scoped_tenancy,
)
from .config import settings
from .db import get_db, serialize_writes
from .ledger import charge_view, local_today, lock_org
from .routes_core import visible_tenancies
from .routes_operations import TRANSITIONS
from .routes_payables import provider_record
from .routes_service_work import provider_services

router = APIRouter(prefix="/api/v1", tags=["coordination"])


@router.get("/tenant-balances", response_model=list[s.TenantBalanceOut])
def tenant_balances(ctx: Context = Depends(context), db: Session = Depends(get_db)):
    require(ctx, "balances")
    rows = []
    for lease in visible_tenancies(db, ctx):
        unit = db.get(m.Unit, lease.unit_id)
        tenant = db.get(m.Tenant, lease.tenant_id)
        prop = db.get(m.Property, unit.property_id)
        charges = [
            charge_view(db, c, local_today(ctx))
            for c in db.scalars(
                select(m.Charge).where(m.Charge.tenancy_id == lease.id, m.Charge.kind != "deposit")
            )
        ]
        rows.append(
            dict(
                id=lease.id,
                tenant_name=tenant.name,
                email=tenant.email,
                phone=tenant.phone,
                reference=lease.reference,
                unit=unit.number,
                property_name=prop.name,
                balance=sum(c["balance"] for c in charges),
                overdue=sum(c["balance"] for c in charges if c["overdue"]),
                linked=tenant.user_id is not None,
                status=lease.status,
            )
        )
    return rows


def message_view(db, record):
    lease = db.get(m.Tenancy, record.tenancy_id)
    unit = db.get(m.Unit, lease.unit_id)
    return dict(
        id=record.id,
        tenancy_id=record.tenancy_id,
        subject=record.subject,
        body=record.body,
        sender=db.get(m.User, record.sender_id).name,
        property_name=db.get(m.Property, unit.property_id).name,
        unit=unit.number,
        email_status=record.email_status,
        in_app=record.in_app,
        created_at=record.created_at.isoformat(),
    )


@router.get("/tenant-messages", response_model=list[s.TenantMessageOut])
def messages(ctx: Context = Depends(context), db: Session = Depends(get_db)):
    if ctx.member.role != "tenant":
        require(ctx, "communicate")
    ids = [t.id for t in visible_tenancies(db, ctx)]
    return [
        message_view(db, r)
        for r in db.scalars(
            select(m.TenantMessage)
            .where(m.TenantMessage.tenancy_id.in_(ids))
            .order_by(m.TenantMessage.created_at.desc())
            .limit(500)
        )
    ]


@router.post("/tenant-messages", status_code=201, response_model=s.TenantMessageOut)
def send_message(
    data: s.TenantMessageIn, ctx: Context = Depends(context), db: Session = Depends(get_db)
):
    require(ctx, "communicate")
    lock_org(db, ctx)
    lease = scoped_tenancy(db, ctx, data.tenancy_id)
    existing = db.scalar(
        select(m.TenantMessage).where(
            m.TenantMessage.org_id == ctx.org.id,
            m.TenantMessage.idempotency_key == data.idempotency_key,
        )
    )
    if existing:
        if any(getattr(existing, key) != value for key, value in data.model_dump().items()):
            raise HTTPException(409, "Message retry key was used for a different message")
        return message_view(db, existing)
    tenant = db.get(m.Tenant, lease.tenant_id)
    email_status = "not_requested"
    if data.deliver_email:
        email_status = "not_configured" if not settings.smtp_host else "no_address"
        if settings.smtp_host and tenant.email:
            try:
                email = str(TypeAdapter(EmailStr).validate_python(tenant.email))
            except ValidationError as error:
                raise HTTPException(
                    422, "The tenant's email address is invalid; correct it first"
                ) from error
            db.add(
                m.Mail(
                    recipient=email,
                    subject=data.subject,
                    body=f"{ctx.org.name} / {lease.reference}\n\n{data.body}",
                )
            )
            email_status = "queued"
    if not tenant.user_id and email_status != "queued":
        raise HTTPException(
            422, "No delivery route: link the tenant account or configure email delivery"
        )
    record = m.TenantMessage(
        org_id=ctx.org.id,
        sender_id=ctx.user.id,
        email_status=email_status,
        in_app=tenant.user_id is not None,
        **data.model_dump(),
    )
    db.add(record)
    db.flush()
    if tenant.user_id:
        notify(
            db,
            ctx,
            data.subject,
            "You have a new message. Open Messages to read it.",
            user_id=tenant.user_id,
        )
    audit(db, ctx, "tenant_message.sent", record.id, email_status=email_status)
    result = message_view(db, record)
    db.commit()
    return result


@router.post("/providers/{provider_id}/invite")
def invite_provider(
    provider_id: str, ctx: Context = Depends(context), db: Session = Depends(get_db)
):
    require(ctx, "invite")
    provider = provider_record(db, ctx, provider_id)
    if not provider.active:
        raise HTTPException(422, "Choose an active provider")
    try:
        email = str(TypeAdapter(EmailStr).validate_python(provider.email)).lower()
    except ValidationError as error:
        raise HTTPException(422, "Save a valid provider sign-in email first") from error
    existing = db.scalar(
        select(m.ProviderAccess).where(m.ProviderAccess.provider_id == provider.id)
    )
    if existing and existing.active:
        raise HTTPException(409, "This provider already has portal access")
    token = secrets.token_urlsafe(40)
    db.add(
        m.ActionToken(
            token_hash=digest(token),
            kind="provider_invite",
            email=email,
            payload={"org_id": ctx.org.id, "provider_id": provider.id},
            expires_at=m.now() + timedelta(days=3),
        )
    )
    db.add(
        m.Mail(
            recipient=email,
            subject="Your JOJOBUILDS service-provider invitation",
            body=f"Open {settings.web_origin}/?invite={token}\nSign in with this email to accept. Invitation expires in 3 days.",
        )
    )
    audit(db, ctx, "provider.invited", provider.id)
    db.commit()
    return {"message": "Provider invitation queued; delivery requires the email worker."}


@router.post("/providers/{provider_id}/revoke")
def revoke_provider(
    provider_id: str, ctx: Context = Depends(context), db: Session = Depends(get_db)
):
    require(ctx, "invite")
    provider_record(db, ctx, provider_id)
    link = db.scalar(select(m.ProviderAccess).where(m.ProviderAccess.provider_id == provider_id))
    if link:
        link.active = False
    for token in db.scalars(select(m.ActionToken).where(m.ActionToken.kind == "provider_invite")):
        if token.payload.get("provider_id") == provider_id:
            db.delete(token)
    audit(db, ctx, "provider.access_revoked", provider_id)
    db.commit()
    return {"ok": True}


@router.get("/provider-portal", response_model=s.ProviderPortalOut)
def provider_portal(auth=Depends(authenticated), db: Session = Depends(get_db)):
    links = provider_links(db, auth[0].id)
    providers = {link.provider_id for link in links}
    landlords = []
    for org_id in sorted({link.org_id for link in links}):
        org = db.get(m.Organization, org_id)
        owner = db.scalar(
            select(m.User)
            .join(m.Membership)
            .where(
                m.Membership.org_id == org_id,
                m.Membership.role == "owner",
                m.Membership.active.is_(True),
            )
        )
        landlords.append(
            dict(
                id=org.id,
                name=org.name,
                landlord=owner.name if owner else org.name,
                demo=org.demo,
                currency=org.currency,
            )
        )
    requests = []
    for record in db.scalars(
        select(m.Maintenance)
        .where(m.Maintenance.provider_id.in_(providers))
        .order_by(m.Maintenance.created_at.desc())
    ):
        prop = db.get(m.Property, record.property_id)
        lease = db.get(m.Tenancy, record.tenancy_id) if record.tenancy_id else None
        tenant = db.get(m.Tenant, lease.tenant_id) if lease else None
        unit = db.get(m.Unit, lease.unit_id) if lease else None
        requests.append(
            dict(
                id=record.id,
                org_id=record.org_id,
                provider=db.get(m.ServiceProvider, record.provider_id).name,
                title=record.title,
                description=record.description,
                category=record.category,
                priority=record.priority,
                status=record.status,
                response=record.provider_response,
                provider_note=record.provider_note,
                property_name=prop.name,
                location=prop.location,
                contact=prop.contact,
                tenant_name=tenant.name if tenant else None,
                tenant_phone=tenant.phone if tenant else None,
                unit=unit.number if unit else None,
                updates=record.updates,
            )
        )
    return {
        "landlords": landlords,
        "requests": requests,
        "services": provider_services(db, auth[0].id),
    }


@router.post("/provider-portal/requests/{request_id}")
def provider_action(
    request_id: str,
    data: s.ProviderActionIn,
    auth=Depends(authenticated),
    db: Session = Depends(get_db),
):
    serialize_writes(db)
    record = db.scalar(
        select(m.Maintenance).where(m.Maintenance.id == request_id).with_for_update()
    )
    links = provider_links(db, auth[0].id)
    if not record or not any(
        link.provider_id == record.provider_id and link.org_id == record.org_id for link in links
    ):
        raise HTTPException(404, "Assigned service request not found")
    previous = db.scalar(
        select(m.ProviderAction).where(
            m.ProviderAction.request_id == record.id,
            m.ProviderAction.idempotency_key == data.idempotency_key,
        )
    )
    if previous:
        if previous.user_id != auth[0].id or previous.payload != data.model_dump():
            raise HTTPException(409, "Job retry key was used for a different action")
        return {"ok": True}
    if record.status in ("resolved", "closed"):
        raise HTTPException(409, "This job is complete; contact the manager to reopen it")
    if data.action == "progress":
        if record.provider_response != "accepted":
            raise HTTPException(409, "Accept this assignment before updating progress")
        if not data.status or (
            data.status != record.status and data.status not in TRANSITIONS[record.status]
        ):
            raise HTTPException(422, "Invalid job progress transition")
        record.status = data.status
        note = data.note
    else:
        if record.provider_response != "pending":
            raise HTTPException(409, "This assignment has already been answered")
        record.provider_response = "accepted" if data.action == "accept" else "declined"
        record.provider_note = data.note
        if data.action == "accept" and record.status in ("submitted", "acknowledged"):
            record.status = "assigned"
        note = f"Service provider {record.provider_response} the assignment."
    record.updates = [
        *record.updates,
        dict(at=m.now().isoformat(), actor=auth[0].name, status=record.status, note=note),
    ]
    db.add(
        m.ProviderAction(
            request_id=record.id,
            user_id=auth[0].id,
            idempotency_key=data.idempotency_key,
            payload=data.model_dump(),
        )
    )
    db.add(
        m.Audit(
            org_id=record.org_id,
            actor_id=auth[0].id,
            action="provider.job_updated",
            entity_id=record.id,
            details={"action": data.action, "status": record.status},
        )
    )
    for member in db.scalars(
        select(m.Membership).where(
            m.Membership.org_id == record.org_id,
            m.Membership.active.is_(True),
            m.Membership.role.in_(("owner", "manager")),
        )
    ):
        assigned = member.role == "owner" or db.scalar(
            select(m.Assignment.id).where(
                m.Assignment.membership_id == member.id,
                m.Assignment.property_id == record.property_id,
            )
        )
        if assigned:
            db.add(
                m.Notification(
                    org_id=record.org_id,
                    user_id=member.user_id,
                    title="Service request update",
                    body=f"{record.title}: {data.action}.",
                )
            )
    if record.tenancy_id:
        tenant = db.get(m.Tenant, db.get(m.Tenancy, record.tenancy_id).tenant_id)
        if tenant.user_id:
            db.add(
                m.Notification(
                    org_id=record.org_id,
                    user_id=tenant.user_id,
                    title="Maintenance update",
                    body="Your service request has an update.",
                )
            )
    db.commit()
    return {"ok": True}
