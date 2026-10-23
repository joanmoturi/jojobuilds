from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

Role = Literal["owner", "manager", "agent", "caretaker", "maintenance", "finance", "tenant"]
Money = Annotated[int, Field(strict=True, gt=0, le=1_000_000_000_000)]
Period = Annotated[str, Field(pattern=r"^(20\d{2}|2100)-(0[1-9]|1[0-2])$")]
PayableKind = Literal["service", "operating", "tax", "loan", "owner_use"]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Login(Input):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class Recover(Input):
    email: EmailStr


class Redeem(Input):
    token: str = Field(min_length=20, max_length=150)
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=12, max_length=200)


class Invite(Input):
    email: EmailStr
    role: Role
    property_ids: list[str] = Field(default_factory=list, max_length=200)
    tenant_id: str | None = None

    @model_validator(mode="after")
    def role_fields(self):
        if self.role == "tenant":
            if not self.tenant_id:
                raise ValueError("Select an existing tenant")
            if self.property_ids:
                raise ValueError("Tenant access follows their own tenancy, not staff assignments")
        elif self.tenant_id:
            raise ValueError("A tenant record is only applicable to the tenant role")
        return self


class PropertyIn(Input):
    name: str = Field(min_length=1, max_length=150)
    location: str = Field(min_length=1, max_length=200)
    county: str = Field(default="", max_length=80)
    contact: str = Field(default="", max_length=150)
    archived: bool = False


class UnitIn(Input):
    property_id: str
    number: str = Field(min_length=1, max_length=40)
    building: str = Field(default="Main", min_length=1, max_length=80)
    floor: str = Field(default="", max_length=30)
    unit_type: str = Field(default="Residential", max_length=60)
    usage: Literal["residential", "commercial"] = "residential"
    default_rent: Money


class TenantIn(Input):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(default="", max_length=254)
    phone: str = Field(default="", max_length=30)
    emergency_contact: str = Field(default="", max_length=150)


class TenancyIn(Input):
    unit_id: str
    tenant_id: str
    reference: str = Field(min_length=3, max_length=40, pattern=r"^[A-Za-z0-9-]+$")
    rent: Money
    deposit: int = Field(default=0, ge=0, le=1_000_000_000_000)
    due_day: int = Field(default=5, ge=1, le=31)
    start_date: date
    end_date: date | None = None

    @model_validator(mode="after")
    def date_order(self):
        if self.end_date and self.end_date < self.start_date:
            raise ValueError("End date must not precede start date")
        return self


class EndTenancy(Input):
    end_date: date
    reason: str = Field(min_length=3, max_length=300)


class Bill(Input):
    period: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")


class ChargeIn(Input):
    tenancy_id: str
    period: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    kind: Literal["rent", "water", "garbage", "service", "deposit", "opening", "adjustment"]
    description: str = Field(min_length=1, max_length=200)
    amount: Money
    due_date: date


class PaymentIn(Input):
    tenancy_id: str
    amount: Money
    received_on: date
    reference: str = Field(default="", max_length=150)
    method: Literal["bank", "mpesa", "cash", "cheque"]
    purpose: Literal["rent", "deposit"] = "rent"
    idempotency_key: str = Field(min_length=16, max_length=100)


class Reason(Input):
    reason: str = Field(min_length=5, max_length=300)


class Decision(Input):
    action: Literal["confirm", "reject", "defer"]
    tenancy_id: str | None = None
    reason: str = Field(min_length=5, max_length=300)


class MaintenanceIn(Input):
    property_id: str
    tenancy_id: str | None = None
    title: str = Field(min_length=3, max_length=150)
    description: str = Field(min_length=5, max_length=2000)
    category: str = Field(default="General", max_length=50)
    priority: Literal["low", "normal", "high", "urgent"] = "normal"


class MaintenanceUpdate(Input):
    status: Literal[
        "submitted",
        "acknowledged",
        "assigned",
        "in_progress",
        "awaiting_parts",
        "resolved",
        "closed",
    ]
    note: str = Field(min_length=3, max_length=1000)
    assigned_to: str = Field(default="", max_length=150)
    provider_id: str | None = None
    cost: int | None = Field(default=None, ge=0, le=1_000_000_000)


class OrganizationOut(BaseModel):
    id: str
    name: str
    role: Role
    currency: str
    timezone: str
    demo: bool


class SessionOut(BaseModel):
    user_id: str
    name: str
    email: str
    csrf: str
    organizations: list[OrganizationOut]
    token: str | None = None
    provider_access: bool = False


class DashboardOut(BaseModel):
    period: str
    currency: str
    properties: int
    units: int
    occupied: int
    billed: int
    allocated: int
    outstanding: int
    overdue: int
    cash_received: int
    unallocated_credit: int
    pending_review: int
    maintenance_open: int
    last_import: str | None
    statement_refresh_due: bool
    demo: bool


class PropertyOut(BaseModel):
    id: str
    name: str
    location: str
    county: str
    contact: str
    units: int
    occupied: int
    billed: int | None
    collected: int | None
    outstanding: int | None


class UnitOut(BaseModel):
    id: str
    property_id: str
    number: str
    building: str
    floor: str
    unit_type: str
    usage: Literal["residential", "commercial"]
    default_rent: int | None
    occupied: bool


class TenantOut(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    emergency_contact: str
    linked: bool


class TenancyOut(BaseModel):
    id: str
    unit_id: str
    tenant_id: str
    reference: str
    rent: int
    deposit: int
    due_day: int
    start_date: date
    end_date: date | None
    status: str


class RentalOut(TenancyOut):
    property_id: str
    property_name: str
    location: str
    county: str
    contact: str
    number: str
    building: str
    floor: str
    unit_type: str
    usage: Literal["residential", "commercial"]
    currency: str
    outstanding: int
    overdue: int


class ChargeOut(BaseModel):
    id: str
    tenancy_id: str
    period: str
    kind: str
    description: str
    amount: int
    currency: str
    due_date: date
    allocated: int
    balance: int
    overdue: bool


class AllocationOut(BaseModel):
    charge_id: str
    amount: int


class PaymentOut(BaseModel):
    id: str
    tenancy_id: str
    tenant: str
    property_name: str
    unit: str
    amount: int
    currency: str
    reference: str
    method: str
    provenance: str
    purpose: str
    received_on: date
    reversed_at: str | None
    reversal_reason: str | None
    allocated: int
    allocations: list[AllocationOut]


class SuggestionOut(BaseModel):
    tenancy_id: str
    reason: str


class ReconciliationOut(BaseModel):
    id: str
    batch_id: str
    amount: int
    date: date
    description: str
    reference: str
    status: str
    suggestions: list[SuggestionOut]
    filename: str


class UpdateOut(BaseModel):
    at: str
    actor: str
    status: str
    note: str


class MaintenanceOut(BaseModel):
    id: str
    property_id: str
    tenancy_id: str | None
    tenant_name: str | None
    unit: str | None
    property_name: str
    provider_id: str | None
    title: str
    description: str
    category: str
    priority: str
    status: str
    assigned_to: str
    cost: int | None
    provider_response: str | None = None
    provider_note: str | None = None
    updates: list[UpdateOut]
    created_at: str


class MaintenanceOptionOut(BaseModel):
    id: str
    tenant_name: str
    unit: str
    unit_id: str
    property_id: str
    property_name: str


class TenantMessageIn(Input):
    tenancy_id: str
    subject: str = Field(min_length=1, max_length=150)
    body: str = Field(min_length=1, max_length=2000)
    deliver_email: bool = True
    idempotency_key: str = Field(min_length=16, max_length=100)


class ProviderActionIn(Input):
    action: Literal["accept", "decline", "progress"]
    status: Literal["in_progress", "awaiting_parts", "resolved"] | None = None
    note: str = Field(min_length=3, max_length=500)
    idempotency_key: str = Field(min_length=16, max_length=100)


class GoogleStart(Input):
    invitation: str | None = Field(default=None, min_length=20, max_length=150)


class TenantBalanceOut(BaseModel):
    id: str
    tenant_name: str
    email: str
    phone: str
    reference: str
    unit: str
    property_name: str
    balance: int
    overdue: int
    linked: bool
    status: str


class TenantMessageOut(BaseModel):
    id: str
    tenancy_id: str
    subject: str
    body: str
    sender: str
    property_name: str
    unit: str
    email_status: str
    in_app: bool
    created_at: str


class ProviderLandlordOut(BaseModel):
    id: str
    name: str
    landlord: str
    demo: bool
    currency: str


class ProviderJobOut(BaseModel):
    id: str
    org_id: str
    provider: str
    title: str
    description: str
    category: str
    priority: str
    status: str
    response: str
    provider_note: str
    property_name: str
    location: str
    contact: str
    tenant_name: str | None
    tenant_phone: str | None
    unit: str | None
    updates: list[UpdateOut]


class ProviderPortalOut(BaseModel):
    landlords: list[ProviderLandlordOut]
    requests: list[ProviderJobOut]
    services: list["ProviderServiceOut"]


class MessageContactOut(BaseModel):
    user_id: str
    name: str
    role: str
    property_id: str
    property_name: str
    tenancy_id: str | None = None
    request_id: str | None = None
    provider_id: str | None = None
    label: str


class ConversationStart(Input):
    org_id: str
    property_id: str
    recipient_id: str
    tenancy_id: str | None = None
    request_id: str | None = None
    body: str = Field(min_length=1, max_length=2000)
    idempotency_key: str = Field(min_length=16, max_length=100)


class ConversationReply(Input):
    body: str = Field(min_length=1, max_length=2000)
    idempotency_key: str = Field(min_length=16, max_length=100)


class ConversationMessageOut(BaseModel):
    id: str
    sender_id: str
    sender: str
    body: str
    created_at: str


class ConversationOut(BaseModel):
    id: str
    org_id: str
    property_id: str
    property_name: str
    participants: list[str]
    tenancy_id: str | None
    request_id: str | None
    provider_id: str | None
    context_label: str
    observer: bool
    messages: list[ConversationMessageOut]


class QuoteItem(Input):
    description: str = Field(min_length=1, max_length=200)
    quantity: int = Field(strict=True, ge=1, le=10000)
    unit_price: Money


class QuotationIn(Input):
    items: list[QuoteItem] = Field(min_length=1, max_length=50)
    terms_days: int = Field(default=14, strict=True, ge=0, le=365)
    notes: str = Field(default="", max_length=1000)
    idempotency_key: str = Field(min_length=16, max_length=100)

    @model_validator(mode="after")
    def total_limit(self):
        if sum(item.quantity * item.unit_price for item in self.items) > 1_000_000_000_000:
            raise ValueError("Quotation total exceeds the supported amount")
        return self


class ServiceInvoiceIn(Input):
    quote_id: str
    reference: str = Field(min_length=1, max_length=150)
    issued_on: date
    notes: str = Field(default="", max_length=1000)
    idempotency_key: str = Field(min_length=16, max_length=100)


class ServiceReview(Input):
    decision: Literal["approve", "reject"]
    note: str = Field(min_length=3, max_length=500)


class ServiceDocumentOut(BaseModel):
    id: str
    request_id: str
    provider_id: str
    kind: Literal["quotation", "invoice"]
    revision: int
    quote_id: str | None
    items: list[QuoteItem]
    amount: int
    currency: str
    terms_days: int
    reference: str
    issued_on: date
    notes: str
    status: str
    payable_id: str | None
    review_note: str
    created_at: str
    reviewed_at: str | None


class ServiceWorkOut(BaseModel):
    currency: str
    provider_id: str | None
    accepted: bool
    can_quote: bool
    documents: list[ServiceDocumentOut]


class RecurringChargeIn(Input):
    tenancy_id: str
    kind: Literal["water", "garbage", "service"]
    description: str = Field(min_length=1, max_length=200)
    amount: Money
    due_day: int = Field(default=5, ge=1, le=31)
    start_period: Period
    end_period: Period | None = None
    active: bool = True

    @model_validator(mode="after")
    def period_order(self):
        if self.end_period and self.end_period < self.start_period:
            raise ValueError("End period must not precede start period")
        return self


class RecurringChargeOut(RecurringChargeIn):
    id: str


class ProviderIn(Input):
    name: str = Field(min_length=1, max_length=150)
    trade: str = Field(min_length=1, max_length=80)
    contact_name: str = Field(default="", max_length=120)
    phone: str = Field(default="", max_length=30)
    email: str = Field(default="", max_length=254)
    address: str = Field(default="", max_length=200)
    notes: str = Field(default="", max_length=500)
    active: bool = True


class ProviderOut(ProviderIn):
    id: str
    portal_access: bool = False
    billed: int | None
    paid: int | None
    balance: int | None
    last_paid_on: date | None


class PayableIn(Input):
    kind: PayableKind
    property_id: str | None = None
    provider_id: str | None = None
    maintenance_id: str | None = None
    description: str = Field(min_length=1, max_length=200)
    reference: str = Field(default="", max_length=150)
    amount: Money
    issued_on: date
    due_date: date
    idempotency_key: str = Field(min_length=16, max_length=100)

    @model_validator(mode="after")
    def relationships(self):
        if self.kind in ("service", "operating") and not self.property_id:
            raise ValueError("Property costs require a property")
        if self.kind == "service" and not self.provider_id:
            raise ValueError("A service bill requires a provider")
        if self.kind != "service" and (self.provider_id or self.maintenance_id):
            raise ValueError("Only service bills can link a provider or maintenance job")
        return self


class OutgoingPaymentIn(Input):
    amount: Money
    paid_on: date
    method: Literal["bank", "mpesa", "cash", "cheque"]
    reference: str = Field(default="", max_length=150)
    idempotency_key: str = Field(min_length=16, max_length=100)


class OutgoingPaymentOut(BaseModel):
    id: str
    amount: int
    paid_on: date
    method: str
    reference: str
    reversed_at: str | None
    reversal_reason: str | None


class PayableOut(BaseModel):
    id: str
    kind: PayableKind
    property_id: str | None
    property_name: str | None
    provider_id: str | None
    provider_name: str | None
    maintenance_id: str | None
    description: str
    reference: str
    amount: int
    paid: int
    balance: int
    issued_on: date
    due_date: date
    last_paid_on: date | None
    overdue: bool
    voided_at: str | None
    void_reason: str | None
    payments: list[OutgoingPaymentOut]


class ProviderServiceOut(BaseModel):
    id: str
    org_id: str
    request_id: str | None
    property_name: str
    description: str
    reference: str
    currency: str
    amount: int
    paid: int
    balance: int
    status: Literal["awaiting_payment", "partially_paid", "paid", "voided"]
    invoice_status: str | None
    due_date: date
    payments: list[OutgoingPaymentOut]


class OwnerFinanceOut(BaseModel):
    period: str
    inflows: int
    service_paid: int
    operating_paid: int
    tax_paid: int
    loan_paid: int
    owner_use_paid: int
    net_movement: int
    outstanding: int
    overdue: int
