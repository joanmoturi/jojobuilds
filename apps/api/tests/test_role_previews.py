import pytest
from sqlalchemy import select

from app import models as m
from app.cli import demo_staff
from app.db import SessionLocal


@pytest.mark.parametrize("role", ["manager", "agent", "finance", "caretaker", "maintenance"])
def test_demo_staff_uses_real_role_and_only_selected_property(client, portfolio, monkeypatch, role):
    with SessionLocal.begin() as db:
        db.get(m.Organization, portfolio["org"]).demo = True
        db.add(m.Property(org_id=portfolio["org"], name="Unassigned property", location="Example"))
    monkeypatch.setenv("JOJOBUILDS_BOOTSTRAP_PASSWORD", "synthetic-role-password")
    demo_staff("owner@example.com", "demo-staff@example.com", role, "Test Property", None)
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "demo-staff@example.com", "password": "synthetic-role-password"},
    )
    assert login.status_code == 200, login.text
    assert login.json()["organizations"][0]["role"] == role
    client.headers["X-CSRF-Token"] = login.json()["csrf"]
    assert [prop["id"] for prop in client.get("/api/v1/properties").json()] == [
        portfolio["property"]
    ]
    assert client.get("/api/v1/owner-finances?period=2026-10").status_code == 403
    assert client.get("/api/v1/charges").status_code == (200 if role == "finance" else 403)
    with SessionLocal() as db:
        assert db.get(m.Tenant, portfolio["tenant"]).user_id is None
        owner = db.scalar(select(m.User).where(m.User.email == "owner@example.com"))
        assert (
            db.scalar(select(m.Membership.role).where(m.Membership.user_id == owner.id)) == "owner"
        )
    with pytest.raises(SystemExit, match="already exists"):
        demo_staff("owner@example.com", "demo-staff@example.com", role, "Test Property", None)


def test_demo_staff_refuses_real_portfolios_and_invalid_scope(portfolio, monkeypatch):
    monkeypatch.setenv("JOJOBUILDS_BOOTSTRAP_PASSWORD", "synthetic-role-password")
    with pytest.raises(SystemExit, match="synthetic demo portfolio"):
        demo_staff("owner@example.com", "demo-staff@example.com", "manager", "Test Property", None)
    with SessionLocal.begin() as db:
        db.get(m.Organization, portfolio["org"]).demo = True
    with pytest.raises(SystemExit, match="staff role"):
        demo_staff("owner@example.com", "demo-staff@example.com", "owner", "Test Property", None)
    with pytest.raises(SystemExit, match="exactly one active property"):
        demo_staff(
            "owner@example.com", "demo-staff@example.com", "manager", "Not in this portfolio", None
        )
    with SessionLocal() as db:
        assert db.scalar(select(m.User.id).where(m.User.email == "demo-staff@example.com")) is None


@pytest.mark.parametrize("role", ["tenant", "manager"])
def test_invitations_only_accept_fields_for_selected_role(client, portfolio, role):
    data = {
        "email": "tenant@example.com" if role == "tenant" else "invite-staff@example.com",
        "role": role,
        "tenant_id": portfolio["tenant"],
        "property_ids": [portfolio["property"]],
    }
    assert client.post("/api/v1/invitations", json=data).status_code == 422
    if role == "tenant":
        data["property_ids"] = []
    else:
        data["tenant_id"] = None
    invited = client.post("/api/v1/invitations", json=data)
    assert invited.status_code == 200, invited.text
    with SessionLocal() as db:
        mail = db.scalar(select(m.Mail).where(m.Mail.recipient == data["email"]))
        token = mail.body.split("?invite=")[1].split()[0]
    accepted = client.post(
        "/api/v1/auth/redeem",
        json={
            "token": token,
            "name": "Synthetic invitee",
            "password": "synthetic-invitation-password",
        },
    )
    assert accepted.status_code == 200, accepted.text
    with SessionLocal() as db:
        user = db.scalar(select(m.User).where(m.User.email == data["email"]))
        membership = db.scalar(select(m.Membership).where(m.Membership.user_id == user.id))
        assignments = list(
            db.scalars(
                select(m.Assignment.property_id).where(m.Assignment.membership_id == membership.id)
            )
        )
        assert membership.role == role
        assert assignments == ([] if role == "tenant" else [portfolio["property"]])
        assert db.get(m.Tenant, portfolio["tenant"]).user_id == (
            user.id if role == "tenant" else None
        )
