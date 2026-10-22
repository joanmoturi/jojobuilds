from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models as m
from . import schemas as s
from .auth import (
    Context,
    audit,
    context,
    notify,
    property_ids,
    require,
    scoped_property,
    scoped_tenancy,
)
from .config import settings
from .db import get_db
from .imports import MAX_SIZE
from .routes_core import visible_tenancies
from .routes_payables import provider_record

router = APIRouter(prefix="/api/v1", tags=["operations"])
TRANSITIONS = {
    "submitted": {"acknowledged", "assigned"},
    "acknowledged": {"assigned", "in_progress"},
    "assigned": {"in_progress", "acknowledged"},
    "in_progress": {"awaiting_parts", "resolved"},
    "awaiting_parts": {"in_progress", "resolved"},
    "resolved": {"closed", "in_progress"},
    "closed": {"in_progress"},
}


def request_access(db: Session, ctx: Context, request_id: str):
    record = db.get(m.Maintenance, request_id)
    if not record or record.org_id != ctx.org.id:
        raise HTTPException(404, "Maintenance request not found")
    scoped_property(db, ctx, record.property_id)
    if ctx.member.role == "tenant":
        if not record.tenancy_id:
            raise HTTPException(404, "Maintenance request not found")
        scoped_tenancy(db, ctx, record.tenancy_id)
    return record


@router.get("/maintenance", response_model=list[s.MaintenanceOut])
def maintenance(ctx: Context = Depends(context), db: Session = Depends(get_db)):
    query = select(m.Maintenance).where(
        m.Maintenance.org_id == ctx.org.id, m.Maintenance.property_id.in_(property_ids(db, ctx))
    )
    if ctx.member.role == "tenant":
        query = query.where(
            m.Maintenance.tenancy_id.in_([t.id for t in visible_tenancies(db, ctx)])
        )
    result = []
    for r in db.scalars(query.order_by(m.Maintenance.created_at.desc()).limit(500)):
        tenancy = db.get(m.Tenancy, r.tenancy_id) if r.tenancy_id else None
        tenant = db.get(m.Tenant, tenancy.tenant_id) if tenancy else None
        unit = db.get(m.Unit, tenancy.unit_id) if tenancy else None
        result.append(
            dict(
                id=r.id,
                property_id=r.property_id,
                tenancy_id=r.tenancy_id,
                tenant_name=tenant.name if tenant else None,
                unit=unit.number if unit else None,
                property_name=db.get(m.Property, r.property_id).name,
                provider_id=None if ctx.member.role == "tenant" else r.provider_id,
                title=r.title,
                description=r.description,
                category=r.category,
                priority=r.priority,
                status=r.status,
                assigned_to=r.assigned_to,
                cost=None if ctx.member.role == "tenant" else r.cost,
                updates=r.updates,
                created_at=r.created_at.isoformat(),
            )
        )
    return result


@router.get("/maintenance-options", response_model=list[s.MaintenanceOptionOut])
def maintenance_options(ctx: Context = Depends(context), db: Session = Depends(get_db)):
    result = []
    for tenancy in visible_tenancies(db, ctx):
        if tenancy.status != "active":
            continue
        unit = db.get(m.Unit, tenancy.unit_id)
        result.append(
            dict(
                id=tenancy.id,
                tenant_name=db.get(m.Tenant, tenancy.tenant_id).name,
                unit=unit.number,
                unit_id=unit.id,
                property_id=unit.property_id,
                property_name=db.get(m.Property, unit.property_id).name,
            )
        )
    return result


@router.post("/maintenance", status_code=201)
def create_maintenance(
    data: s.MaintenanceIn, ctx: Context = Depends(context), db: Session = Depends(get_db)
):
    scoped_property(db, ctx, data.property_id)
    if ctx.member.role == "tenant" and not data.tenancy_id:
        raise HTTPException(422, "Select your tenancy")
    if data.tenancy_id:
        tenancy = scoped_tenancy(db, ctx, data.tenancy_id)
        if db.get(m.Unit, tenancy.unit_id).property_id != data.property_id:
            raise HTTPException(422, "Tenancy belongs to a different property")
    record = m.Maintenance(org_id=ctx.org.id, created_by=ctx.user.id, **data.model_dump())
    db.add(record)
    db.flush()
    audit(db, ctx, "maintenance.submitted", record.id)
    owner = db.scalar(
        select(m.Membership).where(
            m.Membership.org_id == ctx.org.id,
            m.Membership.role == "owner",
            m.Membership.active.is_(True),
        )
    )
    if owner:
        notify(
            db, ctx, "New maintenance request", "A request needs attention.", user_id=owner.user_id
        )
    return {"id": record.id}


@router.post("/maintenance/{request_id}")
def update_maintenance(
    request_id: str,
    data: s.MaintenanceUpdate,
    ctx: Context = Depends(context),
    db: Session = Depends(get_db),
):
    require(ctx, "maintain")
    record = request_access(db, ctx, request_id)
    if data.status != record.status and data.status not in TRANSITIONS[record.status]:
        raise HTTPException(422, f"Cannot move from {record.status} to {data.status}")
    if data.provider_id:
        provider = provider_record(db, ctx, data.provider_id)
        if not provider.active and data.provider_id != record.provider_id:
            raise HTTPException(422, "Choose an active service provider")
        record.assigned_to = provider.name
    else:
        record.assigned_to = data.assigned_to
    record.provider_id = data.provider_id
    record.updates = [
        *record.updates,
        {
            "at": m.now().isoformat(),
            "actor": ctx.user.name,
            "status": data.status,
            "note": data.note,
        },
    ]
    record.status = data.status
    record.cost = data.cost
    audit(db, ctx, "maintenance.updated", record.id, status=data.status)
    if record.tenancy_id:
        tenant = db.get(m.Tenant, db.get(m.Tenancy, record.tenancy_id).tenant_id)
        if tenant.user_id:
            notify(
                db, ctx, "Maintenance update", "Your request has an update.", user_id=tenant.user_id
            )
    return {"ok": True}


@router.get("/attachments")
def attachments(ctx: Context = Depends(context), db: Session = Depends(get_db)):
    query = select(m.Attachment).where(
        m.Attachment.org_id == ctx.org.id, m.Attachment.property_id.in_(property_ids(db, ctx))
    )
    if ctx.member.role == "tenant":
        query = query.where(m.Attachment.tenancy_id.in_([t.id for t in visible_tenancies(db, ctx)]))
    if ctx.member.role in ("caretaker", "maintenance"):
        query = query.where(m.Attachment.maintenance_id.is_not(None))
    return [
        dict(
            id=a.id,
            name=a.name,
            tenancy_id=a.tenancy_id,
            maintenance_id=a.maintenance_id,
            property_id=a.property_id,
            size=a.size,
            created_at=a.created_at,
        )
        for a in db.scalars(query.order_by(m.Attachment.created_at.desc()).limit(500))
    ]


@router.post("/attachments", status_code=201)
async def upload_attachment(
    file: UploadFile = File(),
    property_id: str = Form(),
    tenancy_id: str = Form(default=""),
    maintenance_id: str = Form(default=""),
    ctx: Context = Depends(context),
    db: Session = Depends(get_db),
):
    scoped_property(db, ctx, property_id)
    if ctx.member.role in ("caretaker", "maintenance") and not maintenance_id:
        raise HTTPException(403, "Your role can only upload maintenance attachments")
    if ctx.member.role == "tenant" and not tenancy_id:
        raise HTTPException(422, "Tenant uploads must be attached to your tenancy")
    if tenancy_id:
        tenancy = scoped_tenancy(db, ctx, tenancy_id)
        if db.get(m.Unit, tenancy.unit_id).property_id != property_id:
            raise HTTPException(422, "Tenancy belongs to a different property")
    if maintenance_id:
        record = request_access(db, ctx, maintenance_id)
        if record.property_id != property_id or (tenancy_id and record.tenancy_id != tenancy_id):
            raise HTTPException(422, "Request does not match property/tenancy")
    content = await file.read(MAX_SIZE + 1)
    if not content or len(content) > MAX_SIZE:
        raise HTTPException(422, "File must be between 1 byte and 5 MB")
    if content.startswith(b"%PDF-"):
        extension, media = ".pdf", "application/pdf"
    elif content.startswith(b"\x89PNG\r\n\x1a\n"):
        extension, media = ".png", "image/png"
    elif content.startswith(b"\xff\xd8\xff"):
        extension, media = ".jpg", "image/jpeg"
    else:
        raise HTTPException(422, "Only PDF, PNG and JPEG attachments are supported")
    if Path(file.filename or "").suffix.lower() not in (
        extension,
        ".jpeg" if extension == ".jpg" else extension,
    ):
        raise HTTPException(422, "File extension does not match its content")
    record = m.Attachment(
        org_id=ctx.org.id,
        property_id=property_id,
        tenancy_id=tenancy_id or None,
        maintenance_id=maintenance_id or None,
        name=Path(file.filename or f"document{extension}").name[:150],
        storage_name=m.uid() + extension,
        content_type=media,
        size=len(content),
        created_by=ctx.user.id,
    )
    directory = settings.data_dir / "attachments"
    directory.mkdir(parents=True, exist_ok=True)
    (directory / record.storage_name).write_bytes(content)
    db.add(record)
    db.flush()
    audit(db, ctx, "attachment.uploaded", record.id)
    return {"id": record.id}


@router.get("/attachments/{attachment_id}/download")
def download_attachment(
    attachment_id: str, ctx: Context = Depends(context), db: Session = Depends(get_db)
):
    record = db.get(m.Attachment, attachment_id)
    if not record or record.org_id != ctx.org.id:
        raise HTTPException(404, "Attachment not found")
    scoped_property(db, ctx, record.property_id)
    if ctx.member.role in ("caretaker", "maintenance") and not record.maintenance_id:
        raise HTTPException(404, "Attachment not found")
    if ctx.member.role == "tenant":
        if not record.tenancy_id:
            raise HTTPException(404, "Attachment not found")
        scoped_tenancy(db, ctx, record.tenancy_id)
    path = settings.data_dir / "attachments" / record.storage_name
    if not path.is_file():
        raise HTTPException(410, "Attachment is unavailable; restore it from backup")
    return FileResponse(
        path,
        filename=record.name,
        media_type=record.content_type,
        headers={"X-Content-Type-Options": "nosniff"},
    )
