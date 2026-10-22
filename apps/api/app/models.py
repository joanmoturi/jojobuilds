import uuid
from datetime import UTC, date, datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def uid():
    return str(uuid.uuid4())


def now():
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(150))
    currency: Mapped[str] = mapped_column(String(3), default="KES")
    timezone: Mapped[str] = mapped_column(String(60), default="Africa/Nairobi")
    country: Mapped[str] = mapped_column(String(2), default="KE")
    demo: Mapped[bool] = mapped_column(Boolean, default=False)


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("org_id", "user_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[str] = mapped_column(String(30))
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Property(Base):
    __tablename__ = "properties"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(150))
    location: Mapped[str] = mapped_column(String(200))
    county: Mapped[str] = mapped_column(String(80), default="")
    contact: Mapped[str] = mapped_column(String(150), default="")
    archived: Mapped[bool] = mapped_column(Boolean, default=False)


class Assignment(Base):
    __tablename__ = "assignments"
    __table_args__ = (UniqueConstraint("membership_id", "property_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    membership_id: Mapped[str] = mapped_column(ForeignKey("memberships.id"))
    property_id: Mapped[str] = mapped_column(ForeignKey("properties.id"))


class Unit(Base):
    __tablename__ = "units"
    __table_args__ = (
        UniqueConstraint("property_id", "building", "number"),
        CheckConstraint("default_rent >= 0"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    property_id: Mapped[str] = mapped_column(ForeignKey("properties.id"), index=True)
    building: Mapped[str] = mapped_column(String(80), default="Main")
    floor: Mapped[str] = mapped_column(String(30), default="")
    number: Mapped[str] = mapped_column(String(40))
    unit_type: Mapped[str] = mapped_column(String(60), default="Residential")
    usage: Mapped[str] = mapped_column(
        String(20), default="residential", server_default="residential"
    )
    default_rent: Mapped[int] = mapped_column(BigInteger)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)


class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), default="")
    phone: Mapped[str] = mapped_column(String(30), default="")
    emergency_contact: Mapped[str] = mapped_column(String(150), default="")


class Tenancy(Base):
    __tablename__ = "tenancies"
    __table_args__ = (
        CheckConstraint("rent > 0 AND deposit >= 0 AND due_day BETWEEN 1 AND 31"),
        UniqueConstraint("org_id", "reference"),
        Index(
            "one_active_tenancy_per_unit",
            "unit_id",
            unique=True,
            sqlite_where=text("status = 'active'"),
            postgresql_where=text("status = 'active'"),
        ),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    unit_id: Mapped[str] = mapped_column(ForeignKey("units.id"), index=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True)
    reference: Mapped[str] = mapped_column(String(40))
    rent: Mapped[int] = mapped_column(BigInteger)
    deposit: Mapped[int] = mapped_column(BigInteger, default=0)
    due_day: Mapped[int] = mapped_column(Integer, default=5)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")


class Charge(Base):
    __tablename__ = "charges"
    __table_args__ = (
        UniqueConstraint("tenancy_id", "period", "kind"),
        CheckConstraint("amount > 0"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    tenancy_id: Mapped[str] = mapped_column(ForeignKey("tenancies.id"), index=True)
    period: Mapped[str] = mapped_column(String(7))
    kind: Mapped[str] = mapped_column(String(30), default="rent")
    description: Mapped[str] = mapped_column(String(200), default="Monthly rent")
    amount: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(3))
    due_date: Mapped[date] = mapped_column(Date)


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        UniqueConstraint("org_id", "idempotency_key"),
        CheckConstraint("amount > 0"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    tenancy_id: Mapped[str] = mapped_column(ForeignKey("tenancies.id"), index=True)
    amount: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(3))
    received_on: Mapped[date] = mapped_column(Date)
    reference: Mapped[str] = mapped_column(String(150), default="")
    method: Mapped[str] = mapped_column(String(30))
    provenance: Mapped[str] = mapped_column(String(30))
    purpose: Mapped[str] = mapped_column(String(20), default="rent", server_default="rent")
    idempotency_key: Mapped[str] = mapped_column(String(100))
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    reversal_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    reversed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Allocation(Base):
    __tablename__ = "allocations"
    __table_args__ = (UniqueConstraint("payment_id", "charge_id"), CheckConstraint("amount > 0"))
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    payment_id: Mapped[str] = mapped_column(ForeignKey("payments.id"), index=True)
    charge_id: Mapped[str] = mapped_column(ForeignKey("charges.id"), index=True)
    amount: Mapped[int] = mapped_column(BigInteger)


class ImportBatch(Base):
    __tablename__ = "import_batches"
    __table_args__ = (UniqueConstraint("org_id", "account", "sha256"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    property_id: Mapped[str] = mapped_column(ForeignKey("properties.id"), index=True)
    account: Mapped[str] = mapped_column(String(80))
    filename: Mapped[str] = mapped_column(String(150))
    sha256: Mapped[str] = mapped_column(String(64))
    storage_name: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    errors: Mapped[list] = mapped_column(JSON, default=list)


class ImportedTransaction(Base):
    __tablename__ = "imported_transactions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    batch_id: Mapped[str] = mapped_column(ForeignKey("import_batches.id"), index=True)
    row_number: Mapped[int] = mapped_column(Integer)
    occurred_on: Mapped[date] = mapped_column(Date)
    amount: Mapped[int] = mapped_column(BigInteger)
    description: Mapped[str] = mapped_column(String(500))
    reference: Mapped[str] = mapped_column(String(150), default="")
    fingerprint: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(30), default="review")
    payment_id: Mapped[str | None] = mapped_column(ForeignKey("payments.id"), nullable=True)
    decision_reason: Mapped[str] = mapped_column(String(300), default="")


class Maintenance(Base):
    __tablename__ = "maintenance"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    property_id: Mapped[str] = mapped_column(ForeignKey("properties.id"), index=True)
    tenancy_id: Mapped[str | None] = mapped_column(ForeignKey("tenancies.id"), nullable=True)
    provider_id: Mapped[str | None] = mapped_column(
        ForeignKey("service_providers.id", name="fk_maintenance_provider"), nullable=True
    )
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(String(2000))
    category: Mapped[str] = mapped_column(String(50), default="General")
    priority: Mapped[str] = mapped_column(String(20), default="normal")
    status: Mapped[str] = mapped_column(String(30), default="submitted")
    assigned_to: Mapped[str] = mapped_column(String(150), default="")
    cost: Mapped[int] = mapped_column(BigInteger, default=0)
    updates: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class RecurringCharge(Base):
    __tablename__ = "recurring_charges"
    __table_args__ = (
        UniqueConstraint("tenancy_id", "kind"),
        CheckConstraint("amount > 0 AND due_day BETWEEN 1 AND 31", name="ck_recurring_amount_day"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    tenancy_id: Mapped[str] = mapped_column(ForeignKey("tenancies.id"), index=True)
    kind: Mapped[str] = mapped_column(String(30))
    description: Mapped[str] = mapped_column(String(200))
    amount: Mapped[int] = mapped_column(BigInteger)
    due_day: Mapped[int] = mapped_column(Integer, default=5)
    start_period: Mapped[str] = mapped_column(String(7))
    end_period: Mapped[str | None] = mapped_column(String(7), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class ServiceProvider(Base):
    __tablename__ = "service_providers"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(150))
    trade: Mapped[str] = mapped_column(String(80))
    contact_name: Mapped[str] = mapped_column(String(120), default="")
    phone: Mapped[str] = mapped_column(String(30), default="")
    email: Mapped[str] = mapped_column(String(254), default="")
    address: Mapped[str] = mapped_column(String(200), default="")
    notes: Mapped[str] = mapped_column(String(500), default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Payable(Base):
    __tablename__ = "payables"
    __table_args__ = (
        UniqueConstraint("org_id", "idempotency_key"),
        CheckConstraint("amount > 0", name="ck_payable_positive"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    property_id: Mapped[str | None] = mapped_column(
        ForeignKey("properties.id"), nullable=True, index=True
    )
    provider_id: Mapped[str | None] = mapped_column(
        ForeignKey("service_providers.id"), nullable=True, index=True
    )
    maintenance_id: Mapped[str | None] = mapped_column(ForeignKey("maintenance.id"), nullable=True)
    kind: Mapped[str] = mapped_column(String(30))
    description: Mapped[str] = mapped_column(String(200))
    reference: Mapped[str] = mapped_column(String(150), default="")
    amount: Mapped[int] = mapped_column(BigInteger)
    issued_on: Mapped[date] = mapped_column(Date)
    due_date: Mapped[date] = mapped_column(Date)
    idempotency_key: Mapped[str] = mapped_column(String(100))
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    voided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    void_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)


class OutgoingPayment(Base):
    __tablename__ = "outgoing_payments"
    __table_args__ = (
        UniqueConstraint("org_id", "idempotency_key"),
        CheckConstraint("amount > 0", name="ck_outgoing_positive"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    payable_id: Mapped[str] = mapped_column(ForeignKey("payables.id"), index=True)
    amount: Mapped[int] = mapped_column(BigInteger)
    paid_on: Mapped[date] = mapped_column(Date)
    method: Mapped[str] = mapped_column(String(30))
    reference: Mapped[str] = mapped_column(String(150), default="")
    idempotency_key: Mapped[str] = mapped_column(String(100))
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    reversed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reversal_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(150))
    body: Mapped[str] = mapped_column(String(400))
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Audit(Base):
    __tablename__ = "audit_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(100))
    entity_id: Mapped[str] = mapped_column(String(36))
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AuthSession(Base):
    __tablename__ = "sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    csrf: Mapped[str] = mapped_column(String(100))
    mobile: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ActionToken(Base):
    __tablename__ = "action_tokens"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    kind: Mapped[str] = mapped_column(String(20))
    email: Mapped[str] = mapped_column(String(254))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Mail(Base):
    __tablename__ = "mail_outbox"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    recipient: Mapped[str] = mapped_column(String(254))
    subject: Mapped[str] = mapped_column(String(150))
    body: Mapped[str] = mapped_column(String(3000))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)


class Attachment(Base):
    __tablename__ = "attachments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    property_id: Mapped[str] = mapped_column(ForeignKey("properties.id"), index=True)
    tenancy_id: Mapped[str | None] = mapped_column(ForeignKey("tenancies.id"), nullable=True)
    maintenance_id: Mapped[str | None] = mapped_column(ForeignKey("maintenance.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(150))
    storage_name: Mapped[str] = mapped_column(String(80))
    content_type: Mapped[str] = mapped_column(String(80))
    size: Mapped[int] = mapped_column(Integer)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class RateBucket(Base):
    __tablename__ = "rate_buckets"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    count: Mapped[int] = mapped_column(Integer, default=0)
