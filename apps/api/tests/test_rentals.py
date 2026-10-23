from datetime import date, timedelta

import pytest
from sqlalchemy import select

from app import models as m
from app.auth import passwords
from app.cli import demo_rentals, demo_tenant
from app.db import SessionLocal


def test_rentals_separate_units_agreed_rents_balances_and_tenancy_history(client, portfolio):
    assert client.get("/api/v1/rentals").status_code == 403
    today = date.today()
    with SessionLocal.begin() as db:
        user = m.User(
            email="renter@example.com",
            name="Synthetic multi-unit tenant",
            password_hash=passwords.hash("synthetic-rental-password"),
        )
        other = m.Tenant(org_id=portfolio["org"], name="Another tenant")
        db.add_all([user, other])
        db.flush()
        db.get(m.Tenant, portfolio["tenant"]).user_id = user.id
        db.get(m.Unit, portfolio["unit"]).default_rent = 9900000
        db.add(m.Membership(org_id=portfolio["org"], user_id=user.id, role="tenant"))
        own_ids = [portfolio["tenancy"]]
        for label, tenant_id, status, rent in [
            ("S02", portfolio["tenant"], "active", 1500000),
            ("OLD-01", portfolio["tenant"], "ended", 2000000),
            ("PRIVATE-01", other.id, "active", 9000000),
        ]:
            unit = m.Unit(
                org_id=portfolio["org"],
                property_id=portfolio["property"],
                number=label,
                usage="commercial",
                unit_type="Rental stall",
                default_rent=rent + 100000,
            )
            db.add(unit)
            db.flush()
            lease = m.Tenancy(
                org_id=portfolio["org"],
                unit_id=unit.id,
                tenant_id=tenant_id,
                reference=f"RENT-{label}",
                rent=rent,
                start_date=date(2026, 1, 1),
                end_date=today - timedelta(days=30) if status == "ended" else None,
                status=status,
            )
            db.add(lease)
            db.flush()
            if tenant_id == portfolio["tenant"]:
                own_ids.append(lease.id)
            if status == "ended":
                next_lease = m.Tenancy(
                    org_id=portfolio["org"],
                    unit_id=unit.id,
                    tenant_id=other.id,
                    reference="PRIVATE-NEXT-OCCUPANT",
                    rent=9500000,
                    start_date=today,
                )
                db.add(next_lease)
                db.flush()
                db.add(
                    m.Charge(
                        org_id=portfolio["org"],
                        tenancy_id=next_lease.id,
                        period="2026-01",
                        kind="water",
                        description="Other occupant's private bill",
                        amount=999999,
                        currency="KES",
                        due_date=today - timedelta(days=1),
                    )
                )
        for index, tenancy_id in enumerate(own_ids, start=1):
            db.add(
                m.Charge(
                    org_id=portfolio["org"],
                    tenancy_id=tenancy_id,
                    period="2026-01",
                    kind="water",
                    description="Synthetic water",
                    amount=index * 10000,
                    currency="KES",
                    due_date=today - timedelta(days=1),
                )
            )
        db.add(
            m.Charge(
                org_id=portfolio["org"],
                tenancy_id=own_ids[0],
                period="2026-01",
                kind="deposit",
                description="Not rent arrears",
                amount=4500000,
                currency="KES",
                due_date=today - timedelta(days=1),
            )
        )
        foreign = m.Organization(name="Another organization")
        db.add(foreign)
        db.flush()
        db.add(m.Membership(org_id=foreign.id, user_id=user.id, role="tenant"))
        foreign_tenant = m.Tenant(org_id=foreign.id, user_id=user.id, name="Same user, other org")
        foreign_property = m.Property(
            org_id=foreign.id, name="Private foreign location", location="Example"
        )
        db.add_all([foreign_tenant, foreign_property])
        db.flush()
        foreign_unit = m.Unit(
            org_id=foreign.id,
            property_id=foreign_property.id,
            number="FOREIGN",
            default_rent=1000000,
        )
        db.add(foreign_unit)
        db.flush()
        db.add(
            m.Tenancy(
                org_id=foreign.id,
                unit_id=foreign_unit.id,
                tenant_id=foreign_tenant.id,
                reference="FOREIGN",
                rent=1000000,
                start_date=today,
            )
        )
    payment = client.post(
        "/api/v1/payments",
        json={
            "tenancy_id": portfolio["tenancy"],
            "amount": 5000,
            "received_on": str(today),
            "method": "bank",
            "idempotency_key": "synthetic-rental-payment",
        },
    )
    assert payment.status_code == 201, payment.text
    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "renter@example.com",
            "password": "synthetic-rental-password",
        },
    )
    assert login.status_code == 200
    client.headers["X-CSRF-Token"] = login.json()["csrf"]
    response = client.get("/api/v1/rentals")
    assert response.status_code == 200, response.text
    rows = {row["id"]: row for row in response.json()}
    assert set(rows) == set(own_ids)
    assert rows[own_ids[0]]["rent"] == 4500000
    assert rows[own_ids[1]]["rent"] == 1500000
    assert rows[own_ids[2]]["status"] == "ended"
    assert [rows[tid]["outstanding"] for tid in own_ids] == [5000, 20000, 30000]
    assert [rows[tid]["overdue"] for tid in own_ids] == [5000, 20000, 30000]
    assert all(row["property_id"] == portfolio["property"] for row in rows.values())
    assert all("occupied" not in row and "units" not in row for row in rows.values())
    own_property = client.get("/api/v1/properties").json()[0]
    assert (own_property["units"], own_property["occupied"]) == (3, 2)
    assert (
        client.put(
            f"/api/v1/units/{portfolio['unit']}",
            json={
                "property_id": portfolio["property"],
                "number": "A1",
                "default_rent": 4500000,
            },
        ).status_code
        == 403
    )


def test_editing_unit_specification_preserves_agreed_rent_and_bills(client, portfolio):
    body = {
        "property_id": portfolio["property"],
        "number": "BAR-02",
        "building": "Main",
        "usage": "commercial",
        "unit_type": "Bar premises",
        "default_rent": 6000000,
    }
    charge = client.post(
        "/api/v1/charges",
        json={
            "tenancy_id": portfolio["tenancy"],
            "period": "2026-01",
            "kind": "rent",
            "description": "Existing agreed rent",
            "amount": 4500000,
            "due_date": "2026-01-31",
        },
    )
    assert charge.status_code == 201
    updated = client.put(f"/api/v1/units/{portfolio['unit']}", json=body)
    assert updated.status_code == 200, updated.text
    unit = client.get("/api/v1/units").json()[0]
    assert (unit["number"], unit["usage"], unit["unit_type"], unit["default_rent"]) == (
        "BAR-02",
        "commercial",
        "Bar premises",
        6000000,
    )
    assert client.get("/api/v1/tenancies").json()[0]["rent"] == 4500000
    assert client.get("/api/v1/charges").json()[0]["amount"] == 4500000
    assert (
        client.put(
            f"/api/v1/units/{portfolio['unit']}", json={**body, "usage": "invalid"}
        ).status_code
        == 422
    )
    with SessionLocal.begin() as db:
        prop = m.Property(org_id=portfolio["org"], name="Unassigned", location="Example")
        db.add(prop)
        db.flush()
        foreign_unit = m.Unit(
            org_id=portfolio["org"], property_id=prop.id, number="PRIVATE", default_rent=1000000
        )
        manager = m.User(
            email="manager@example.com",
            name="Synthetic manager",
            password_hash=passwords.hash("synthetic-rental-password"),
        )
        db.add_all([foreign_unit, manager])
        db.flush()
        member = m.Membership(org_id=portfolio["org"], user_id=manager.id, role="manager")
        db.add(member)
        db.flush()
        db.add(m.Assignment(membership_id=member.id, property_id=portfolio["property"]))
        other_property_id, other_unit_id = prop.id, foreign_unit.id
    assert (
        client.put(
            f"/api/v1/units/{portfolio['unit']}", json={**body, "property_id": other_property_id}
        ).status_code
        == 409
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "manager@example.com", "password": "synthetic-rental-password"},
    )
    client.headers["X-CSRF-Token"] = login.json()["csrf"]
    assert client.put(f"/api/v1/units/{portfolio['unit']}", json=body).status_code == 403
    assert (
        client.put(
            f"/api/v1/units/{other_unit_id}", json={**body, "property_id": other_property_id}
        ).status_code
        == 403
    )


def test_demo_rentals_are_idempotent_and_keep_existing_payments_and_login(
    client, portfolio, monkeypatch
):
    with SessionLocal.begin() as db:
        db.get(m.Organization, portfolio["org"]).demo = True
        db.get(m.Property, portfolio["property"]).name = "Kilimani Heights"
    monkeypatch.setenv("JOJOBUILDS_BOOTSTRAP_PASSWORD", "synthetic-rental-password")
    demo_tenant("owner@example.com", "demo-tenant@example.com", None)
    payment = client.post(
        "/api/v1/payments",
        json={
            "tenancy_id": portfolio["tenancy"],
            "amount": 5000,
            "received_on": str(date.today()),
            "method": "bank",
            "idempotency_key": "synthetic-demo-existing-payment",
        },
    )
    assert payment.status_code == 201
    demo_rentals("owner@example.com", "demo-tenant@example.com", None)
    with SessionLocal() as db:
        leases = list(db.scalars(select(m.Tenancy)))
        lease_values = [(t.id, t.reference, t.rent, t.start_date) for t in leases]
        charge_values = [(c.id, c.amount) for c in db.scalars(select(m.Charge))]
        assert len(leases) == 3
        assert len(charge_values) == 5
        assert len(list(db.scalars(select(m.RecurringCharge)))) == 2
        assert db.get(m.Unit, portfolio["unit"]).unit_type == "1-bedroom apartment"
    demo_rentals("owner@example.com", "demo-tenant@example.com", None)
    with SessionLocal() as db:
        assert [
            (t.id, t.reference, t.rent, t.start_date) for t in db.scalars(select(m.Tenancy))
        ] == lease_values
        assert [(c.id, c.amount) for c in db.scalars(select(m.Charge))] == charge_values
        assert list(db.scalars(select(m.Payment.id))) == [payment.json()["id"]]
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "demo-tenant@example.com", "password": "synthetic-rental-password"},
    )
    assert login.status_code == 200
    rows = client.get("/api/v1/rentals").json()
    assert {row["property_name"] for row in rows} == {
        "Kilimani Heights",
        "Utawala Stalls",
        "Bypass Bar",
    }
    assert sum(row["usage"] == "commercial" for row in rows) == 2


def test_demo_rentals_refuse_real_portfolios_and_roll_back_collisions(portfolio, monkeypatch):
    with pytest.raises(SystemExit, match="synthetic demo portfolio"):
        demo_rentals("owner@example.com", "demo-tenant@example.com", None)
    with SessionLocal.begin() as db:
        db.get(m.Organization, portfolio["org"]).demo = True
        db.get(m.Property, portfolio["property"]).name = "Kilimani Heights"
    with pytest.raises(SystemExit, match="linked tenant"):
        demo_rentals("owner@example.com", "missing@example.com", None)
    monkeypatch.setenv("JOJOBUILDS_BOOTSTRAP_PASSWORD", "synthetic-rental-password")
    demo_tenant("owner@example.com", "demo-tenant@example.com", None)
    with SessionLocal.begin() as db:
        db.add(m.Property(org_id=portfolio["org"], name="Bypass Bar", location="Already entered"))
    with pytest.raises(SystemExit, match="no changes saved"):
        demo_rentals("owner@example.com", "demo-tenant@example.com", None)
    with SessionLocal() as db:
        assert db.scalar(select(m.Property.id).where(m.Property.name == "Utawala Stalls")) is None
        assert db.get(m.Unit, portfolio["unit"]).unit_type == "Residential"
        assert len(list(db.scalars(select(m.Tenancy)))) == 1
