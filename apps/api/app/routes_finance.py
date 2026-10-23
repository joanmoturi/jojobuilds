import csv
import hashlib
import io
import re
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import ValidationError
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
from .imports import MAX_SIZE, ColumnMapping, fingerprint, normalize, read_rows
from .ledger import (
    allocate_credit,
    bill_period,
    charge_view,
    local_today,
    lock_org,
    payment_allocated,
    post_payment,
)
from .routes_core import visible_tenancies

router = APIRouter(prefix="/api/v1", tags=["finance"])


def financial_access(ctx: Context):
    if ctx.member.role not in ("owner", "finance", "tenant"):
        raise HTTPException(403, "Financial records are restricted")


@router.get("/charges", response_model=list[s.ChargeOut])
def charges(ctx: Context = Depends(context), db: Session = Depends(get_db)):
    financial_access(ctx)
    ids = [t.id for t in visible_tenancies(db, ctx)]
    rows = db.scalars(
        select(m.Charge)
        .where(m.Charge.tenancy_id.in_(ids))
        .order_by(m.Charge.due_date.desc())
        .limit(2000)
    )
    return [charge_view(db, c, local_today(ctx)) for c in rows]


@router.post("/charges", status_code=201)
def create_charge(data: s.ChargeIn, ctx: Context = Depends(context), db: Session = Depends(get_db)):
    require(ctx, "finance")
    lock_org(db, ctx)
    scoped_tenancy(db, ctx, data.tenancy_id)
    charge = m.Charge(org_id=ctx.org.id, currency=ctx.org.currency, **data.model_dump())
    db.add(charge)
    db.flush()
    allocate_credit(db, data.tenancy_id)
    audit(db, ctx, "charge.created", charge.id, kind=charge.kind, amount=charge.amount)
    return {"id": charge.id}


@router.post("/billing/generate")
def generate(data: s.Bill, ctx: Context = Depends(context), db: Session = Depends(get_db)):
    require(ctx, "finance")
    return bill_period(db, ctx, data.period, visible_tenancies(db, ctx))


def payment_view(db: Session, payment: m.Payment):
    tenancy = db.get(m.Tenancy, payment.tenancy_id)
    tenant = db.get(m.Tenant, tenancy.tenant_id)
    unit = db.get(m.Unit, tenancy.unit_id)
    prop = db.get(m.Property, unit.property_id)
    return dict(
        id=payment.id,
        tenancy_id=payment.tenancy_id,
        tenant=tenant.name,
        property_name=prop.name,
        unit=unit.number,
        amount=payment.amount,
        currency=payment.currency,
        reference=payment.reference,
        method=payment.method,
        provenance=payment.provenance,
        purpose=payment.purpose,
        received_on=payment.received_on,
        reversed_at=payment.reversed_at.isoformat() if payment.reversed_at else None,
        reversal_reason=payment.reversal_reason,
        allocated=payment_allocated(db, payment.id) if not payment.reversed_at else 0,
        allocations=[
            {"charge_id": a.charge_id, "amount": a.amount}
            for a in db.scalars(select(m.Allocation).where(m.Allocation.payment_id == payment.id))
        ],
    )


@router.get("/payments", response_model=list[s.PaymentOut])
def payments(ctx: Context = Depends(context), db: Session = Depends(get_db)):
    financial_access(ctx)
    ids = [t.id for t in visible_tenancies(db, ctx)]
    return [
        payment_view(db, p)
        for p in db.scalars(
            select(m.Payment)
            .where(m.Payment.tenancy_id.in_(ids))
            .order_by(m.Payment.created_at.desc())
            .limit(1000)
        )
    ]


@router.post("/payments", status_code=201, response_model=s.PaymentOut)
def create_payment(
    data: s.PaymentIn, ctx: Context = Depends(context), db: Session = Depends(get_db)
):
    require(ctx, "finance")
    return payment_view(db, post_payment(db, ctx, data))


@router.post("/payments/{payment_id}/reverse")
def reverse(
    payment_id: str, data: s.Reason, ctx: Context = Depends(context), db: Session = Depends(get_db)
):
    require(ctx, "finance")
    lock_org(db, ctx)
    payment = db.get(m.Payment, payment_id)
    if not payment or payment.org_id != ctx.org.id:
        raise HTTPException(404, "Payment not found")
    scoped_tenancy(db, ctx, payment.tenancy_id)
    if payment.reversed_at:
        raise HTTPException(409, "Payment has already been reversed")
    payment.reversed_at = m.now()
    payment.reversal_reason = data.reason
    audit(db, ctx, "payment.reversed", payment.id, reason=data.reason)
    return {"ok": True}


@router.get("/imports")
def imports(ctx: Context = Depends(context), db: Session = Depends(get_db)):
    require(ctx, "finance")
    props = property_ids(db, ctx)
    rows = db.scalars(
        select(m.ImportBatch)
        .where(m.ImportBatch.org_id == ctx.org.id, m.ImportBatch.property_id.in_(props))
        .order_by(m.ImportBatch.created_at.desc())
        .limit(100)
    )
    return [
        dict(
            id=b.id,
            filename=b.filename,
            account=b.account,
            property_id=b.property_id,
            created_at=b.created_at,
            errors=b.errors,
        )
        for b in rows
    ]


@router.post("/imports/preview")
async def preview(
    file: UploadFile = File(), mapping: str = Form(default=""), ctx: Context = Depends(context)
):
    require(ctx, "finance")
    content = await file.read(MAX_SIZE + 1)
    filename = file.filename or "statement.csv"
    if not mapping:
        headers, rows = read_rows(content, filename)
        return {
            "headers": headers,
            "sample": rows[:5],
            "rows": [],
            "errors": [],
            "total": len(rows),
        }
    try:
        config = ColumnMapping.model_validate_json(mapping)
    except ValidationError as error:
        raise HTTPException(422, "Invalid column mapping") from error
    headers, rows, errors = normalize(content, filename, config)
    return {
        "headers": headers,
        "sample": [],
        "rows": rows[:100],
        "errors": errors,
        "total": len(rows),
        "preview_limit": 100,
    }


@router.post("/imports", status_code=201)
async def commit_import(
    file: UploadFile = File(),
    mapping: str = Form(),
    property_id: str = Form(),
    account: str = Form(min_length=1, max_length=80),
    ctx: Context = Depends(context),
    db: Session = Depends(get_db),
):
    require(ctx, "finance")
    scoped_property(db, ctx, property_id)
    try:
        config = ColumnMapping.model_validate_json(mapping)
    except ValidationError as error:
        raise HTTPException(422, "Invalid column mapping") from error
    content = await file.read(MAX_SIZE + 1)
    filename = Path(file.filename or "statement.csv").name[:150]
    _, rows, errors = normalize(content, filename, config)
    if errors:
        raise HTTPException(
            422,
            {
                "message": "Fix rejected rows before importing. Nothing was imported.",
                "rows": errors[:100],
            },
        )
    lock_org(db, ctx)
    sha = hashlib.sha256(content).hexdigest()
    existing = db.scalar(
        select(m.ImportBatch).where(
            m.ImportBatch.org_id == ctx.org.id,
            m.ImportBatch.account == account,
            m.ImportBatch.sha256 == sha,
        )
    )
    if existing:
        return {"id": existing.id, "existing": True}
    storage_name = m.uid() + Path(filename).suffix.lower()
    batch = m.ImportBatch(
        org_id=ctx.org.id,
        property_id=property_id,
        account=account,
        filename=filename,
        sha256=sha,
        storage_name=storage_name,
        errors=[],
    )
    db.add(batch)
    db.flush()
    for row in rows:
        fp = fingerprint(account, row)
        duplicate = db.scalar(
            select(m.ImportedTransaction.id)
            .join(m.ImportBatch)
            .where(
                m.ImportedTransaction.org_id == ctx.org.id,
                m.ImportBatch.account == account,
                m.ImportedTransaction.fingerprint == fp,
            )
        )
        transaction = m.ImportedTransaction(
            org_id=ctx.org.id,
            batch_id=batch.id,
            row_number=row["row_number"],
            occurred_on=date.fromisoformat(row["date"]),
            amount=row["amount"],
            description=row["description"],
            reference=row["reference"],
            fingerprint=fp,
            status="non_credit"
            if row["amount"] <= 0
            else ("duplicate_review" if duplicate else "review"),
        )
        db.add(transaction)
        db.flush()
    directory = settings.data_dir / "imports"
    directory.mkdir(parents=True, exist_ok=True)
    # No public path; an orphan on DB rollback is covered by storage retention.
    (directory / storage_name).write_bytes(content)
    audit(db, ctx, "statement.imported", batch.id, rows=len(rows))
    notify(
        db,
        ctx,
        "Statement ready for review",
        f"{len(rows)} transactions imported. No payments auto-confirmed.",
    )
    return {"id": batch.id, "existing": False}


@router.get("/imports/{batch_id}/download")
def download_import(batch_id: str, ctx: Context = Depends(context), db: Session = Depends(get_db)):
    require(ctx, "finance")
    batch = db.get(m.ImportBatch, batch_id)
    if not batch or batch.org_id != ctx.org.id:
        raise HTTPException(404, "Import not found")
    scoped_property(db, ctx, batch.property_id)
    path = settings.data_dir / "imports" / batch.storage_name
    if not path.is_file():
        raise HTTPException(410, "Statement artifact is unavailable; restore from backup")
    return FileResponse(path, filename=batch.filename, media_type="application/octet-stream")


@router.get("/reconciliation", response_model=list[s.ReconciliationOut])
def reconciliation(ctx: Context = Depends(context), db: Session = Depends(get_db)):
    require(ctx, "finance")
    batches = db.scalars(
        select(m.ImportBatch).where(
            m.ImportBatch.org_id == ctx.org.id, m.ImportBatch.property_id.in_(property_ids(db, ctx))
        )
    ).all()
    by_id = {b.id: b for b in batches}
    tenancies = visible_tenancies(db, ctx)
    transactions = db.scalars(
        select(m.ImportedTransaction)
        .where(
            m.ImportedTransaction.batch_id.in_(by_id),
            m.ImportedTransaction.status.in_(["review", "duplicate_review", "deferred"]),
        )
        .order_by(m.ImportedTransaction.occurred_on.desc())
        .limit(500)
    ).all()
    result = []
    for transaction in transactions:
        suggestions = []
        words = set(
            re.split(
                r"[^A-Z0-9-]+", (transaction.reference + " " + transaction.description).upper()
            )
        )
        for tenancy in tenancies:
            unit = db.get(m.Unit, tenancy.unit_id)
            if (
                unit.property_id == by_id[transaction.batch_id].property_id
                and tenancy.reference in words
            ):
                suggestions.append(
                    {
                        "tenancy_id": tenancy.id,
                        "reason": "Exact tenancy reference; owner review still required",
                    }
                )
        result.append(
            dict(
                id=transaction.id,
                batch_id=transaction.batch_id,
                amount=transaction.amount,
                date=transaction.occurred_on,
                description=transaction.description,
                reference=transaction.reference,
                status=transaction.status,
                suggestions=suggestions,
                filename=by_id[transaction.batch_id].filename,
            )
        )
    return result


@router.post("/reconciliation/{transaction_id}")
def decide(
    transaction_id: str,
    data: s.Decision,
    ctx: Context = Depends(context),
    db: Session = Depends(get_db),
):
    require(ctx, "finance")
    lock_org(db, ctx)
    transaction = db.get(m.ImportedTransaction, transaction_id)
    if not transaction or transaction.org_id != ctx.org.id:
        raise HTTPException(404, "Transaction not found")
    batch = db.get(m.ImportBatch, transaction.batch_id)
    scoped_property(db, ctx, batch.property_id)
    if transaction.status in ("confirmed", "rejected", "non_credit"):
        raise HTTPException(409, "This transaction already has a final decision")
    if data.action == "confirm":
        if not data.tenancy_id:
            raise HTTPException(422, "Choose a tenancy before confirming")
        tenancy = scoped_tenancy(db, ctx, data.tenancy_id)
        if db.get(m.Unit, tenancy.unit_id).property_id != batch.property_id:
            raise HTTPException(422, "Tenancy does not belong to this import's property")
        if transaction.status == "duplicate_review" and len(data.reason) < 15:
            raise HTTPException(
                422, "Explain why this apparent duplicate is a distinct payment (15+ characters)"
            )
        payment = post_payment(
            db,
            ctx,
            s.PaymentIn(
                tenancy_id=tenancy.id,
                amount=transaction.amount,
                received_on=transaction.occurred_on,
                reference=transaction.reference,
                method="bank",
                idempotency_key=f"import:{transaction.id}",
            ),
            provenance="statement_import",
        )
        transaction.payment_id = payment.id
        transaction.status = "confirmed"
    else:
        transaction.status = "rejected" if data.action == "reject" else "deferred"
    transaction.decision_reason = data.reason
    audit(db, ctx, f"reconciliation.{data.action}", transaction.id, reason=data.reason)
    return {"ok": True}


def safe_cell(value):
    text = str(value)
    return "'" + text if text.startswith(("=", "+", "-", "@", "\t", "\r")) else text


@router.get("/exports/ledger.csv")
def export_ledger(
    tenancy_id: str | None = Query(default=None),
    ctx: Context = Depends(context),
    db: Session = Depends(get_db),
):
    financial_access(ctx)
    tenancy_rows = (
        [scoped_tenancy(db, ctx, tenancy_id)] if tenancy_id else visible_tenancies(db, ctx)
    )
    ids = [t.id for t in tenancy_rows]
    stream = io.StringIO(newline="")
    writer = csv.writer(stream)
    writer.writerow(
        [
            "Type",
            "Date",
            "Tenancy reference",
            "Description",
            "Currency",
            "Amount minor units",
            "Balance minor units",
        ]
    )
    refs = {t.id: t.reference for t in tenancy_rows}
    for charge in db.scalars(select(m.Charge).where(m.Charge.tenancy_id.in_(ids))):
        row = charge_view(db, charge, local_today(ctx))
        writer.writerow(
            [
                safe_cell(v)
                for v in [
                    "charge",
                    charge.due_date,
                    refs[charge.tenancy_id],
                    charge.description,
                    charge.currency,
                    charge.amount,
                    row["balance"],
                ]
            ]
        )
    for payment in db.scalars(select(m.Payment).where(m.Payment.tenancy_id.in_(ids))):
        writer.writerow(
            [
                safe_cell(v)
                for v in [
                    "reversed_payment" if payment.reversed_at else "payment",
                    payment.received_on,
                    refs[payment.tenancy_id],
                    payment.reference,
                    payment.currency,
                    payment.amount,
                    "",
                ]
            ]
        )
    return Response(
        stream.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="JOJOBUILDS-ledger.csv"'},
    )
