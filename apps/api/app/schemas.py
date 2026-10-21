from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

Role = Literal["owner", "manager", "agent", "caretaker", "maintenance", "finance", "tenant"]
Money = Annotated[int, Field(strict=True, gt=0, le=1_000_000_000_000)]


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
    kind: Literal["rent", "water", "service", "deposit", "opening", "adjustment"]
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
    cost: int = Field(default=0, ge=0, le=1_000_000_000)


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
    default_rent: int
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
    title: str
    description: str
    category: str
    priority: str
    status: str
    assigned_to: str
    cost: int | None
    updates: list[UpdateOut]
    created_at: str
