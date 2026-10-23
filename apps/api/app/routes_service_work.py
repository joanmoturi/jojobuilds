from datetime import timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models as m
from . import schemas as s
from .auth import Context, audit, authenticated, context, provider_links
from .db import get_db, serialize_writes
from .ledger import local_today, lock_org
from .routes_operations import request_access
from .routes_payables import create_payable

router = APIRouter(prefix="/api/v1", tags=["service quotations and invoices"])


def provider_job(db: Session, user: m.User, request_id: str, write=False):
    if write:
        serialize_writes(db)
    job = db.get(m.Maintenance, request_id)
    if not job:
        raise HTTPException(404, "Assigned service request not found")
    if write:
        db.scalar(select(m.Organization).where(m.Organization.id == job.org_id).with_for_update())
        job = db.scalar(
            select(m.Maintenance)
            .where(m.Maintenance.id == request_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    if not any(
        link.provider_id == job.provider_id and link.org_id == job.org_id
        for link in provider_links(db, user.id)
    ):
        raise HTTPException(404, "Assigned service request not found")
    return job


def document_view(record: m.ServiceDocument):
    return dict(
        id=record.id,
        request_id=record.request_id,
        provider_id=record.provider_id,
        kind=record.kind,
        revision=record.revision,
        quote_id=record.quote_id,
        items=record.items,
        amount=record.amount,
        currency=record.currency,
        terms_days=record.terms_days,
        reference=record.reference,
        issued_on=record.issued_on,
        notes=record.notes,
        status=record.status,
        payable_id=record.payable_id,
        review_note=record.review_note,
        created_at=record.created_at.isoformat(),
        reviewed_at=record.reviewed_at.isoformat() if record.reviewed_at else None,
    )


def job_documents(db: Session, job: m.Maintenance, provider_only=True):
    query = select(m.ServiceDocument).where(m.ServiceDocument.request_id == job.id)
    if provider_only:
        query = query.where(m.ServiceDocument.provider_id == job.provider_id)
    return list(
        db.scalars(query.order_by(m.ServiceDocument.created_at, m.ServiceDocument.revision))
    )


def work_view(db, job, documents, financial=True):
    return dict(
        currency=db.get(m.Organization, job.org_id).currency,
        provider_id=job.provider_id,
        accepted=job.provider_response == "accepted",
        can_quote=job.provider_response == "accepted" and job.status not in ("resolved", "closed"),
        documents=[document_view(doc) for doc in documents] if financial else [],
    )


@router.get("/provider-portal/requests/{request_id}/service-work", response_model=s.ServiceWorkOut)
def provider_work(request_id: str, auth=Depends(authenticated), db: Session = Depends(get_db)):
    job = provider_job(db, auth[0], request_id)
    return work_view(db, job, job_documents(db, job))


@router.get("/maintenance/{request_id}/service-work", response_model=s.ServiceWorkOut)
def staff_work(request_id: str, ctx: Context = Depends(context), db: Session = Depends(get_db)):
    if ctx.member.role not in ("owner", "manager", "finance"):
        raise HTTPException(403, "Service work is restricted to owner, manager and finance")
    job = request_access(db, ctx, request_id)
    return work_view(
        db, job, job_documents(db, job, provider_only=False), ctx.member.role != "manager"
    )


def previous_submission(db, user, job, payload, kind):
    old = db.scalar(
        select(m.ServiceDocument).where(
            m.ServiceDocument.org_id == job.org_id,
            m.ServiceDocument.created_by == user.id,
            m.ServiceDocument.idempotency_key == payload["idempotency_key"],
        )
    )
    if old:
        if (
            old.request_id != job.id
            or old.provider_id != job.provider_id
            or old.payload != {"kind": kind, **payload}
        ):
            raise HTTPException(409, "Submission retry key was used for a different document")
    return old


def next_revision(db, job, kind):
    previous = db.scalars(
        select(m.ServiceDocument)
        .where(
            m.ServiceDocument.request_id == job.id,
            m.ServiceDocument.provider_id == job.provider_id,
            m.ServiceDocument.kind == kind,
        )
        .order_by(m.ServiceDocument.revision.desc())
    ).first()
    if previous and previous.status != "rejected":
        raise HTTPException(409, f"The existing {kind} must be rejected before another revision")
    return previous.revision + 1 if previous else 1


def notify_review(db, job, title, provider_id=None):
    if provider_id:
        ids = [
            link.user_id
            for link in db.scalars(
                select(m.ProviderAccess).where(
                    m.ProviderAccess.provider_id == provider_id,
                    m.ProviderAccess.active.is_(True),
                )
            )
        ]
    else:
        ids = list(
            db.scalars(
                select(m.Membership.user_id).where(
                    m.Membership.org_id == job.org_id,
                    m.Membership.role == "owner",
                    m.Membership.active.is_(True),
                )
            )
        )
    for user_id in set(ids):
        db.add(
            m.Notification(
                org_id=job.org_id,
                user_id=user_id,
                title=title,
                body=f"Open service work for {job.title}."[:400],
            )
        )


@router.post(
    "/provider-portal/requests/{request_id}/quotations",
    response_model=s.ServiceDocumentOut,
    status_code=201,
)
def submit_quote(
    request_id: str, data: s.QuotationIn, auth=Depends(authenticated), db: Session = Depends(get_db)
):
    job = provider_job(db, auth[0], request_id, write=True)
    payload = data.model_dump(mode="json")
    previous = previous_submission(db, auth[0], job, payload, "quotation")
    if previous:
        return document_view(previous)
    if job.provider_response != "accepted" or job.status in ("resolved", "closed"):
        raise HTTPException(409, "Accept an open job before submitting its quotation")
    org = db.get(m.Organization, job.org_id)
    record = m.ServiceDocument(
        org_id=job.org_id,
        request_id=job.id,
        provider_id=job.provider_id,
        kind="quotation",
        revision=next_revision(db, job, "quotation"),
        items=[item.model_dump() for item in data.items],
        amount=sum(item.quantity * item.unit_price for item in data.items),
        currency=org.currency,
        terms_days=data.terms_days,
        notes=data.notes,
        issued_on=m.now().astimezone(ZoneInfo(org.timezone)).date(),
        created_by=auth[0].id,
        idempotency_key=data.idempotency_key,
        payload={"kind": "quotation", **payload},
    )
    db.add(record)
    db.flush()
    db.add(
        m.Audit(
            org_id=job.org_id,
            actor_id=auth[0].id,
            action="service.quotation_submitted",
            entity_id=record.id,
        )
    )
    notify_review(db, job, "Service quotation awaiting approval")
    db.commit()
    return document_view(record)


@router.post(
    "/provider-portal/requests/{request_id}/invoices",
    response_model=s.ServiceDocumentOut,
    status_code=201,
)
def submit_invoice(
    request_id: str,
    data: s.ServiceInvoiceIn,
    auth=Depends(authenticated),
    db: Session = Depends(get_db),
):
    job = provider_job(db, auth[0], request_id, write=True)
    payload = data.model_dump(mode="json")
    previous = previous_submission(db, auth[0], job, payload, "invoice")
    if previous:
        return document_view(previous)
    if job.provider_response != "accepted":
        raise HTTPException(409, "Accept the job before submitting an invoice")
    quote = db.get(m.ServiceDocument, data.quote_id)
    if not quote or (quote.request_id, quote.provider_id, quote.kind, quote.status) != (
        job.id,
        job.provider_id,
        "quotation",
        "approved",
    ):
        raise HTTPException(422, "Select this job's approved quotation")
    bill = db.get(m.Payable, quote.payable_id)
    if not bill or bill.voided_at:
        raise HTTPException(409, "The approved quotation bill is no longer payable")
    org = db.get(m.Organization, job.org_id)
    if data.issued_on > m.now().astimezone(ZoneInfo(org.timezone)).date():
        raise HTTPException(422, "Invoice issue date cannot be in the future")
    duplicate = db.scalar(
        select(m.ServiceDocument.id).where(
            m.ServiceDocument.org_id == job.org_id,
            m.ServiceDocument.provider_id == job.provider_id,
            m.ServiceDocument.kind == "invoice",
            m.ServiceDocument.reference == data.reference,
            m.ServiceDocument.status != "rejected",
        )
    )
    duplicate_bill = db.scalar(
        select(m.Payable.id).where(
            m.Payable.org_id == job.org_id,
            m.Payable.provider_id == job.provider_id,
            m.Payable.reference == data.reference,
            m.Payable.id != bill.id,
            m.Payable.voided_at.is_(None),
        )
    )
    if duplicate or duplicate_bill:
        raise HTTPException(409, "This provider invoice reference is already submitted or recorded")
    record = m.ServiceDocument(
        org_id=job.org_id,
        request_id=job.id,
        provider_id=job.provider_id,
        kind="invoice",
        revision=next_revision(db, job, "invoice"),
        quote_id=quote.id,
        items=quote.items,
        amount=quote.amount,
        currency=quote.currency,
        terms_days=quote.terms_days,
        reference=data.reference,
        issued_on=data.issued_on,
        notes=data.notes,
        created_by=auth[0].id,
        idempotency_key=data.idempotency_key,
        payload={"kind": "invoice", **payload},
    )
    db.add(record)
    db.flush()
    db.add(
        m.Audit(
            org_id=job.org_id,
            actor_id=auth[0].id,
            action="service.invoice_submitted",
            entity_id=record.id,
        )
    )
    notify_review(db, job, "Service invoice awaiting approval")
    db.commit()
    return document_view(record)


@router.post("/service-documents/{document_id}/review", response_model=s.ServiceDocumentOut)
def review_document(
    document_id: str,
    data: s.ServiceReview,
    ctx: Context = Depends(context),
    db: Session = Depends(get_db),
):
    if ctx.member.role != "owner":
        raise HTTPException(403, "Only the owner approves or rejects quotations and invoices")
    lock_org(db, ctx)
    record = db.get(m.ServiceDocument, document_id)
    if not record or record.org_id != ctx.org.id:
        raise HTTPException(404, "Service document not found")
    job = request_access(db, ctx, record.request_id)
    status = "approved" if data.decision == "approve" else "rejected"
    if record.status != "submitted":
        if record.status == status and record.review_note == data.note:
            return document_view(record)
        raise HTTPException(409, "This document has already been reviewed")
    if data.decision == "approve":
        if job.provider_id != record.provider_id or job.provider_response != "accepted":
            raise HTTPException(409, "This provider no longer has an accepted assignment")
        provider = db.get(m.ServiceProvider, record.provider_id)
        if not provider.active:
            raise HTTPException(409, "The service provider is archived")
        if record.kind == "quotation":
            bill = create_payable(
                s.PayableIn(
                    kind="service",
                    property_id=job.property_id,
                    provider_id=record.provider_id,
                    maintenance_id=job.id,
                    description=job.title,
                    amount=record.amount,
                    issued_on=local_today(ctx),
                    due_date=local_today(ctx) + timedelta(days=record.terms_days),
                    idempotency_key=f"service-quotation:{record.id}",
                ),
                ctx,
                db,
            )
            record.payable_id = bill["id"]
        else:
            quote = db.get(m.ServiceDocument, record.quote_id)
            bill = db.get(m.Payable, quote.payable_id) if quote else None
            if not quote or quote.status != "approved" or not bill or bill.voided_at:
                raise HTTPException(409, "The approved quotation bill is unavailable")
            if bill.amount != record.amount or (
                bill.reference and bill.reference != record.reference
            ):
                raise HTTPException(409, "Invoice does not match the approved bill")
            duplicate = db.scalar(
                select(m.Payable.id).where(
                    m.Payable.provider_id == record.provider_id,
                    m.Payable.org_id == ctx.org.id,
                    m.Payable.reference == record.reference,
                    m.Payable.id != bill.id,
                    m.Payable.voided_at.is_(None),
                )
            )
            if duplicate:
                raise HTTPException(409, "This invoice reference is already recorded")
            bill.reference = record.reference
            record.payable_id = bill.id
    record.status, record.review_note = status, data.note
    record.reviewer_id, record.reviewed_at = ctx.user.id, m.now()
    audit(db, ctx, f"service.{record.kind}_{status}", record.id, amount=record.amount)
    notify_review(db, job, f"Service {record.kind} {status}", provider_id=record.provider_id)
    db.flush()
    db.commit()
    return document_view(record)


def provider_services(db: Session, user_id: str):
    provider_ids = [link.provider_id for link in provider_links(db, user_id)]
    result = []
    for bill in db.scalars(
        select(m.Payable)
        .where(m.Payable.provider_id.in_(provider_ids), m.Payable.kind == "service")
        .order_by(m.Payable.created_at.desc())
    ):
        payments = list(
            db.scalars(
                select(m.OutgoingPayment)
                .where(m.OutgoingPayment.payable_id == bill.id)
                .order_by(m.OutgoingPayment.paid_on, m.OutgoingPayment.created_at)
            )
        )
        paid = sum(payment.amount for payment in payments if not payment.reversed_at)
        status = (
            "voided"
            if bill.voided_at
            else (
                "paid"
                if paid == bill.amount
                else ("partially_paid" if paid else "awaiting_payment")
            )
        )
        latest_invoice = (
            db.scalars(
                select(m.ServiceDocument)
                .where(
                    m.ServiceDocument.request_id == bill.maintenance_id,
                    m.ServiceDocument.provider_id == bill.provider_id,
                    m.ServiceDocument.kind == "invoice",
                )
                .order_by(m.ServiceDocument.revision.desc())
            ).first()
            if bill.maintenance_id
            else None
        )
        result.append(
            dict(
                id=bill.id,
                org_id=bill.org_id,
                request_id=bill.maintenance_id,
                property_name=db.get(m.Property, bill.property_id).name,
                description=bill.description,
                reference=bill.reference,
                currency=db.get(m.Organization, bill.org_id).currency,
                amount=bill.amount,
                paid=paid,
                balance=0 if bill.voided_at else bill.amount - paid,
                status=status,
                invoice_status=latest_invoice.status if latest_invoice else None,
                due_date=bill.due_date,
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
        )
    return result
