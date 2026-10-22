from datetime import date, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select

from app import models as m
from app.auth import passwords
from app.cli import demo_tenant
from app.db import SessionLocal


def bill(client, portfolio, **changes):
    data = {
        "kind": "operating",
        "property_id": portfolio["property"],
        "description": "Synthetic operating bill",
        "amount": 10000,
        "issued_on": (date.today() - timedelta(days=10)).isoformat(),
        "due_date": (date.today() - timedelta(days=1)).isoformat(),
        "idempotency_key": str(uuid4()),
        **changes,
    }
    response = client.post("/api/v1/payables", json=data)
    assert response.status_code == 201, response.text
    return response.json(), data


def outgoing(client, record, amount, **changes):
    data = {
        "amount": amount,
        "paid_on": date.today().isoformat(),
        "method": "bank",
        "reference": "Synthetic transfer",
        "idempotency_key": str(uuid4()),
        **changes,
    }
    return client.post(f"/api/v1/payables/{record['id']}/payments", json=data), data


def test_provider_partial_payments_retries_reversals_and_voids(client, portfolio):
    provider = client.post(
        "/api/v1/providers", json={"name": "Example Plumber", "trade": "Plumbing"}
    ).json()["id"]
    record, data = bill(
        client, portfolio, kind="service", provider_id=provider, reference="INV-001"
    )
    assert client.post("/api/v1/payables", json=data).json()["id"] == record["id"]
    assert client.post("/api/v1/payables", json={**data, "amount": 99}).status_code == 409
    assert (
        client.post("/api/v1/payables", json={**data, "idempotency_key": str(uuid4())}).status_code
        == 409
    )
    partial, payment = outgoing(client, record, 4000)
    assert partial.status_code == 200, partial.text
    assert partial.json()["balance"] == 6000
    assert partial.json()["last_paid_on"] == date.today().isoformat()
    retry = client.post(f"/api/v1/payables/{record['id']}/payments", json=payment)
    assert len(retry.json()["payments"]) == 1
    assert (
        client.post(
            f"/api/v1/payables/{record['id']}/payments", json={**payment, "amount": 3000}
        ).status_code
        == 409
    )
    assert outgoing(client, record, 6001)[0].status_code == 422
    assert (
        outgoing(client, record, 1000, paid_on=(date.today() + timedelta(days=2)).isoformat())[
            0
        ].status_code
        == 422
    )
    provider_view = client.get("/api/v1/providers").json()[0]
    assert (provider_view["billed"], provider_view["paid"], provider_view["balance"]) == (
        10000,
        4000,
        6000,
    )
    assert (
        client.post(
            f"/api/v1/payables/{record['id']}/void", json={"reason": "Incorrect bill"}
        ).status_code
        == 409
    )
    payment_id = partial.json()["payments"][0]["id"]
    assert (
        client.post(
            f"/api/v1/outgoing-payments/{payment_id}/reverse", json={"reason": "Incorrect transfer"}
        ).status_code
        == 200
    )
    provider_view = client.get("/api/v1/providers").json()[0]
    assert (provider_view["balance"], provider_view["last_paid_on"]) == (10000, None)
    assert (
        client.post(
            f"/api/v1/payables/{record['id']}/void", json={"reason": "Duplicate invoice"}
        ).status_code
        == 200
    )
    assert outgoing(client, record, 100)[0].status_code == 409
    assert client.get("/api/v1/providers").json()[0]["balance"] == 0
    history = client.get("/api/v1/payables").json()[0]
    assert history["voided_at"] and history["payments"][0]["reversed_at"]


def test_recurring_rules_preserve_history_and_fill_existing_rent_period(client, portfolio):
    assert (
        client.post("/api/v1/billing/generate", json={"period": "2026-02"}).json()["created"] == 1
    )
    data = {
        "tenancy_id": portfolio["tenancy"],
        "kind": "garbage",
        "description": "Monthly garbage",
        "amount": 50000,
        "due_day": 31,
        "start_period": "2026-02",
        "end_period": "2026-04",
    }
    rule = client.post("/api/v1/recurring-charges", json=data)
    assert rule.status_code == 201, rule.text
    assert (
        client.post("/api/v1/billing/generate", json={"period": "2026-01"}).json()["created"] == 1
    )
    assert (
        client.post("/api/v1/billing/generate", json={"period": "2026-02"}).json()["created"] == 1
    )
    assert (
        client.post("/api/v1/billing/generate", json={"period": "2026-02"}).json()["created"] == 0
    )
    assert client.get("/api/v1/recurring-charges").json()[0]["amount"] == 50000
    assert (
        client.put(
            f"/api/v1/recurring-charges/{rule.json()['id']}", json={**data, "amount": 60000}
        ).status_code
        == 200
    )
    assert (
        client.post("/api/v1/billing/generate", json={"period": "2026-03"}).json()["created"] == 2
    )
    charges = client.get("/api/v1/charges").json()
    february = next(c for c in charges if c["kind"] == "garbage" and c["period"] == "2026-02")
    assert (february["amount"], february["due_date"]) == (50000, "2026-02-28")
    assert (
        next(c for c in charges if c["kind"] == "garbage" and c["period"] == "2026-03")["amount"]
        == 60000
    )
    assert (
        client.put(
            f"/api/v1/recurring-charges/{rule.json()['id']}", json={**data, "active": False}
        ).status_code
        == 200
    )
    assert (
        client.post("/api/v1/billing/generate", json={"period": "2026-04"}).json()["created"] == 1
    )
    assert (
        client.post(
            "/api/v1/charges",
            json={
                "tenancy_id": portfolio["tenancy"],
                "kind": "water",
                "description": "Variable water",
                "amount": 12345,
                "period": "2026-03",
                "due_date": "2026-03-31",
            },
        ).status_code
        == 201
    )


def test_owner_cash_movement_separates_deposits_and_private_owner_use(client, portfolio):
    for purpose in ("rent", "deposit"):
        assert (
            client.post(
                "/api/v1/payments",
                json={
                    "tenancy_id": portfolio["tenancy"],
                    "amount": 100000,
                    "received_on": date.today().isoformat(),
                    "method": "bank",
                    "purpose": purpose,
                    "idempotency_key": str(uuid4()),
                },
            ).status_code
            == 201
        )
    personal, _ = bill(
        client, portfolio, kind="owner_use", description="Private school expenses", amount=20000
    )
    paid, _ = outgoing(client, personal, 12000)
    assert paid.status_code == 200
    summary = client.get(f"/api/v1/owner-finances?period={date.today():%Y-%m}").json()
    assert (summary["inflows"], summary["owner_use_paid"], summary["net_movement"]) == (
        100000,
        12000,
        88000,
    )
    assert (summary["outstanding"], summary["overdue"]) == (8000, 8000)
    assert (
        client.get("/api/v1/dashboard", params={"period": f"{date.today():%Y-%m}"}).json()[
            "cash_received"
        ]
        == 100000
    )


def test_owner_privacy_property_scope_and_tenant_maintenance_options(client, portfolio):
    private, _ = bill(client, portfolio, kind="tax", description="Private manual tax obligation")
    public, _ = bill(client, portfolio)
    with SessionLocal.begin() as db:
        user = m.User(
            email="staff@example.com",
            name="Example staff",
            password_hash=passwords.hash("synthetic-staff-password"),
        )
        db.add(user)
        db.flush()
        member = m.Membership(org_id=portfolio["org"], user_id=user.id, role="finance")
        db.add(member)
        db.flush()
        member_id = member.id
        db.add(m.Assignment(membership_id=member.id, property_id=portfolio["property"]))
        other = m.Property(org_id=portfolio["org"], name="Other property", location="Example")
        db.add(other)
        db.flush()
        other_id = other.id
    inaccessible, _ = bill(client, portfolio, property_id=other_id)
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "staff@example.com", "password": "synthetic-staff-password"},
    )
    client.headers["X-CSRF-Token"] = login.json()["csrf"]
    assert client.get("/api/v1/owner-finances?period=2026-10").status_code == 403
    assert [p["id"] for p in client.get("/api/v1/payables").json()] == [public["id"]]
    for hidden in (private, inaccessible):
        assert outgoing(client, hidden, 100)[0].status_code == 404
    assert (
        client.post(
            "/api/v1/payables",
            json={
                "kind": "owner_use",
                "description": "Not allowed",
                "amount": 100,
                "issued_on": "2026-01-01",
                "due_date": "2026-01-02",
                "idempotency_key": str(uuid4()),
            },
        ).status_code
        == 403
    )
    with SessionLocal.begin() as db:
        db.get(m.Membership, member_id).role = "tenant"
        db.get(m.Tenant, portfolio["tenant"]).user_id = db.scalar(
            select(m.User.id).where(m.User.email == "staff@example.com")
        )
    assert client.get("/api/v1/payables").status_code == 403
    assert client.get("/api/v1/providers").status_code == 403
    options = client.get("/api/v1/maintenance-options").json()
    assert options == [
        {
            "id": portfolio["tenancy"],
            "tenant_name": "Synthetic Tenant",
            "unit": "A1",
            "unit_id": portfolio["unit"],
            "property_id": portfolio["property"],
            "property_name": "Test Property",
        }
    ]
    assert "rent" not in options[0]
    request = client.post(
        "/api/v1/maintenance",
        json={
            "property_id": portfolio["property"],
            "tenancy_id": portfolio["tenancy"],
            "title": "Leaking tap",
            "description": "Synthetic leaking kitchen tap",
        },
    )
    assert request.status_code == 201, request.text
    view = client.get("/api/v1/maintenance").json()[0]
    assert (view["tenant_name"], view["unit"], view["cost"]) == ("Synthetic Tenant", "A1", None)


def test_demo_tenant_command_refuses_real_portfolios(portfolio, monkeypatch):
    monkeypatch.setenv("JOJOBUILDS_BOOTSTRAP_PASSWORD", "synthetic-demo-password")
    with pytest.raises(SystemExit, match="synthetic demo portfolio"):
        demo_tenant("owner@example.com", "demo-tenant@example.com", None)
    with SessionLocal.begin() as db:
        assert db.get(m.Tenant, portfolio["tenant"]).user_id is None
        assert db.scalar(select(m.User.id).where(m.User.email == "demo-tenant@example.com")) is None


def test_provider_assignment_and_contacts_do_not_expose_finances_to_maintenance(client, portfolio):
    provider = client.post(
        "/api/v1/providers",
        json={"name": "Example electrician", "trade": "Electrical", "phone": "+254000000000"},
    ).json()["id"]
    request = client.post(
        "/api/v1/maintenance",
        json={
            "property_id": portfolio["property"],
            "tenancy_id": portfolio["tenancy"],
            "title": "Synthetic socket problem",
            "description": "Example socket needs repair",
        },
    ).json()["id"]
    assert (
        client.post(
            f"/api/v1/maintenance/{request}",
            json={
                "status": "assigned",
                "provider_id": provider,
                "note": "Example electrician assigned",
            },
        ).status_code
        == 200
    )
    record = client.get("/api/v1/maintenance").json()[0]
    assert (record["provider_id"], record["assigned_to"], record["tenant_name"]) == (
        provider,
        "Example electrician",
        "Synthetic Tenant",
    )
    bill(client, portfolio, kind="service", provider_id=provider, maintenance_id=request)
    with SessionLocal.begin() as db:
        other = m.Organization(name="Other synthetic organization")
        db.add(other)
        db.flush()
        foreign = m.ServiceProvider(org_id=other.id, name="Foreign provider", trade="Plumbing")
        db.add(foreign)
        db.flush()
        foreign_id = foreign.id
        membership = db.scalar(select(m.Membership).where(m.Membership.org_id == portfolio["org"]))
        membership.role = "maintenance"
        db.add(m.Assignment(membership_id=membership.id, property_id=portfolio["property"]))
    contacts = client.get("/api/v1/providers").json()
    assert len(contacts) == 1
    assert contacts[0]["phone"] == "+254000000000"
    assert all(
        contacts[0][field] is None for field in ("billed", "paid", "balance", "last_paid_on")
    )
    assert client.get("/api/v1/payables").status_code == 403
    assert client.get("/api/v1/owner-finances?period=2026-10").status_code == 403
    assert client.get("/api/v1/recurring-charges").status_code == 403
    assert client.get("/api/v1/tenancies").status_code == 403
    assert client.get("/api/v1/maintenance-options").json()[0]["id"] == portfolio["tenancy"]
    assert (
        client.post(
            f"/api/v1/maintenance/{request}",
            json={
                "status": "assigned",
                "provider_id": foreign_id,
                "note": "Cannot assign foreign provider",
            },
        ).status_code
        == 404
    )


def test_provider_totals_and_last_paid_date_exclude_unassigned_properties(client, portfolio):
    provider = client.post(
        "/api/v1/providers", json={"name": "Example security company", "trade": "Security"}
    ).json()["id"]
    visible, _ = bill(client, portfolio, kind="service", provider_id=provider)
    earlier = (date.today() - timedelta(days=2)).isoformat()
    assert outgoing(client, visible, 4000, paid_on=earlier)[0].status_code == 200
    other_property = client.post(
        "/api/v1/properties", json={"name": "Other synthetic property", "location": "Example"}
    ).json()["id"]
    hidden, _ = bill(
        client,
        portfolio,
        kind="service",
        provider_id=provider,
        property_id=other_property,
        amount=50000,
    )
    assert outgoing(client, hidden, 30000)[0].status_code == 200
    with SessionLocal.begin() as db:
        member = db.scalar(select(m.Membership).where(m.Membership.org_id == portfolio["org"]))
        member.role = "finance"
        db.add(m.Assignment(membership_id=member.id, property_id=portfolio["property"]))
    contact = client.get("/api/v1/providers").json()[0]
    assert (contact["billed"], contact["paid"], contact["balance"], contact["last_paid_on"]) == (
        10000,
        4000,
        6000,
        earlier,
    )
    assert [record["id"] for record in client.get("/api/v1/payables").json()] == [visible["id"]]
