import re

from sqlalchemy import func, select

from app import models as m
from app.auth import digest, passwords
from app.config import settings
from app.db import SessionLocal

PASSWORD = "synthetic-operations-password"


def sign_in(client, email):
    result = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert result.status_code == 200, result.text
    client.headers["X-CSRF-Token"] = result.json()["csrf"]
    return result.json()


def user(db, email, name="Synthetic person"):
    record = m.User(email=email, name=name, password_hash=passwords.hash(PASSWORD))
    db.add(record)
    db.flush()
    return record


def manager_and_tenant(portfolio):
    with SessionLocal.begin() as db:
        manager = user(db, "manager@example.com")
        tenant_user = user(db, "tenant@example.com")
        member = m.Membership(org_id=portfolio["org"], user_id=manager.id, role="manager")
        db.add(member)
        db.flush()
        db.add(m.Assignment(membership_id=member.id, property_id=portfolio["property"]))
        db.add(m.Membership(org_id=portfolio["org"], user_id=tenant_user.id, role="tenant"))
        db.get(m.Tenant, portfolio["tenant"]).user_id = tenant_user.id


def invitation_token(email, org_id):
    with SessionLocal() as db:
        for mail in db.scalars(select(m.Mail).where(m.Mail.recipient == email)):
            token = re.search(r"\?invite=(\S+)", mail.body)[1]
            action = db.get(m.ActionToken, digest(token))
            if action and action.payload["org_id"] == org_id:
                return token
        raise AssertionError("Synthetic invitation not found")


def test_manager_reads_only_scoped_balances_and_operational_documents(client, portfolio):
    manager_and_tenant(portfolio)
    assert (
        client.post(
            "/api/v1/charges",
            json=dict(
                tenancy_id=portfolio["tenancy"],
                period="2026-01",
                kind="rent",
                description="Synthetic rent",
                amount=4500000,
                due_date="2026-01-31",
            ),
        ).status_code
        == 201
    )
    private = client.post(
        "/api/v1/attachments",
        data={"property_id": portfolio["property"], "tenancy_id": portfolio["tenancy"]},
        files={
            "file": ("agreement.pdf", b"%PDF-1.4\nsynthetic private agreement", "application/pdf")
        },
    )
    assert private.status_code == 201, private.text
    job = client.post(
        "/api/v1/maintenance",
        json=dict(
            property_id=portfolio["property"],
            tenancy_id=portfolio["tenancy"],
            title="Synthetic repair",
            description="Synthetic leaking tap",
        ),
    ).json()["id"]
    assert (
        client.post(
            f"/api/v1/maintenance/{job}",
            json={"status": "acknowledged", "note": "Owner recorded a cost", "cost": 12300},
        ).status_code
        == 200
    )
    with SessionLocal.begin() as db:
        other = m.Property(org_id=portfolio["org"], name="Hidden property", location="Example")
        db.add(other)
        db.flush()
        db.add(
            m.Unit(
                org_id=portfolio["org"],
                property_id=other.id,
                number="PRIVATE",
                default_rent=9999900,
            )
        )
    sign_in(client, "manager@example.com")
    for endpoint in (
        "charges",
        "payments",
        "tenancies",
        "imports",
        "reconciliation",
        "exports/ledger.csv",
        "payables",
        "recurring-charges",
        "dashboard?period=2026-01",
        "owner-finances?period=2026-01",
    ):
        response = client.get(f"/api/v1/{endpoint}")
        assert response.status_code == 403, (endpoint, response.text)
    rows = client.get("/api/v1/tenant-balances").json()
    assert [(row["id"], row["balance"], row["overdue"]) for row in rows] == [
        (portfolio["tenancy"], 4500000, 4500000)
    ]
    assert "rent" not in rows[0] and "deposit" not in rows[0]
    assert client.get("/api/v1/units").json()[0]["default_rent"] is None
    assert client.get("/api/v1/properties").json()[0]["billed"] is None
    assert client.get("/api/v1/maintenance").json()[0]["cost"] is None
    assert client.get("/api/v1/attachments").json() == []
    assert client.get(f"/api/v1/attachments/{private.json()['id']}/download").status_code == 404
    assert (
        client.post(
            "/api/v1/attachments",
            data={"property_id": portfolio["property"]},
            files={"file": ("financial.txt", b"private", "text/plain")},
        ).status_code
        == 403
    )
    assert (
        client.post("/api/v1/properties", json={"name": "No", "location": "No"}).status_code == 403
    )
    assert (
        client.post(
            "/api/v1/payments",
            json=dict(
                tenancy_id=portfolio["tenancy"],
                amount=1000,
                received_on="2026-01-01",
                method="bank",
                idempotency_key="synthetic-denied-payment",
            ),
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/api/v1/maintenance/{job}",
            json={"status": "assigned", "note": "Manager tried cost", "cost": 0},
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/api/v1/maintenance/{job}",
            json={"status": "assigned", "note": "Manager coordinated the job"},
        ).status_code
        == 200
    )
    with SessionLocal() as db:
        assert db.get(m.Maintenance, job).cost == 12300


def test_messages_are_scoped_idempotent_and_report_delivery_channels(
    client, portfolio, monkeypatch
):
    manager_and_tenant(portfolio)
    monkeypatch.setattr(settings, "smtp_host", "")
    sign_in(client, "manager@example.com")
    payload = dict(
        tenancy_id=portfolio["tenancy"],
        subject="Synthetic reminder",
        body="Please review your outstanding balance.",
        deliver_email=True,
        idempotency_key="synthetic-message-key",
    )
    sent = client.post("/api/v1/tenant-messages", json=payload)
    assert sent.status_code == 201, sent.text
    assert sent.json()["email_status"] == "not_configured" and sent.json()["in_app"]
    assert client.post("/api/v1/tenant-messages", json=payload).json()["id"] == sent.json()["id"]
    assert (
        client.post("/api/v1/tenant-messages", json={**payload, "body": "Changed"}).status_code
        == 409
    )
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(m.TenantMessage)) == 1
        assert db.scalar(select(func.count()).select_from(m.Notification)) == 1
        assert db.scalar(select(func.count()).select_from(m.Mail)) == 0
    sign_in(client, "tenant@example.com")
    assert client.get("/api/v1/tenant-messages").json()[0]["body"] == payload["body"]
    assert client.post("/api/v1/tenant-messages", json=payload).status_code == 403
    sign_in(client, "manager@example.com")
    monkeypatch.setattr(settings, "smtp_host", "synthetic-mailhost")
    emailed = client.post(
        "/api/v1/tenant-messages", json={**payload, "idempotency_key": "synthetic-email-message"}
    )
    assert emailed.status_code == 201 and emailed.json()["email_status"] == "queued"
    with SessionLocal.begin() as db:
        db.get(m.Tenant, portfolio["tenant"]).user_id = None
    monkeypatch.setattr(settings, "smtp_host", "")
    assert (
        client.post(
            "/api/v1/tenant-messages", json={**payload, "idempotency_key": "synthetic-no-channel"}
        ).status_code
        == 422
    )
    with SessionLocal.begin() as db:
        db.query(m.Assignment).delete()
    assert client.get("/api/v1/tenant-balances").json() == []
    assert client.get("/api/v1/tenant-messages").json() == []
    assert client.post("/api/v1/tenant-messages", json=payload).status_code == 404


def test_provider_invitation_reuses_one_account_across_landlords_and_revokes(client, portfolio):
    first = client.post(
        "/api/v1/providers",
        json={"name": "Synthetic plumber", "trade": "Plumbing", "email": "provider@example.com"},
    ).json()["id"]
    assert client.post(f"/api/v1/providers/{first}/invite").status_code == 200
    token = invitation_token("provider@example.com", portfolio["org"])
    assert (
        client.post(
            "/api/v1/auth/redeem",
            json={"token": token, "name": "Synthetic provider", "password": PASSWORD},
        ).status_code
        == 200
    )
    with SessionLocal.begin() as db:
        second_org = m.Organization(name="Second synthetic landlord")
        db.add(second_org)
        db.flush()
        second = m.ServiceProvider(
            org_id=second_org.id,
            name="Same provider",
            trade="Plumbing",
            email="provider@example.com",
        )
        db.add(second)
        db.flush()
        owner = db.scalar(select(m.User).where(m.User.email == "owner@example.com"))
        db.add(m.Membership(org_id=second_org.id, user_id=owner.id, role="owner"))
        second_org_id, second_id = second_org.id, second.id
    client.headers["X-Organization"] = second_org_id
    assert client.post(f"/api/v1/providers/{second_id}/invite").status_code == 200
    second_token = invitation_token("provider@example.com", second_org_id)
    session = sign_in(client, "provider@example.com")
    assert session["provider_access"] and session["organizations"] == []
    assert (
        client.post("/api/v1/auth/accept-invitation", json={"reason": second_token}).status_code
        == 200
    )
    portal = client.get("/api/v1/provider-portal").json()
    assert {row["id"] for row in portal["landlords"]} == {portfolio["org"], second_org_id}
    assert client.get("/api/v1/properties").status_code == 403
    assert (
        client.post("/api/v1/auth/accept-invitation", json={"reason": second_token}).status_code
        == 422
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@example.com", "password": "synthetic-test-password"},
    )
    client.headers.update(
        {"X-CSRF-Token": login.json()["csrf"], "X-Organization": portfolio["org"]}
    )
    assert (
        client.put(
            f"/api/v1/providers/{first}",
            json={"name": "Plumber", "trade": "Plumbing", "email": "different@example.com"},
        ).status_code
        == 409
    )
    assert client.post(f"/api/v1/providers/{first}/revoke").status_code == 200
    sign_in(client, "provider@example.com")
    assert [row["id"] for row in client.get("/api/v1/provider-portal").json()["landlords"]] == [
        second_org_id
    ]


def test_provider_actions_are_assignment_only_and_private_response_is_not_tenant_visible(
    client, portfolio
):
    manager_and_tenant(portfolio)
    with SessionLocal.begin() as db:
        provider_user = user(db, "provider@example.com")
        provider = m.ServiceProvider(
            org_id=portfolio["org"],
            name="Synthetic plumber",
            trade="Plumbing",
            email=provider_user.email,
        )
        other = m.ServiceProvider(
            org_id=portfolio["org"], name="Different plumber", trade="Plumbing"
        )
        db.add_all([provider, other])
        db.flush()
        db.add(
            m.ProviderAccess(
                org_id=portfolio["org"], provider_id=provider.id, user_id=provider_user.id
            )
        )
        owner = db.scalar(select(m.User).where(m.User.email == "owner@example.com"))
        jobs = [
            m.Maintenance(
                org_id=portfolio["org"],
                property_id=portfolio["property"],
                tenancy_id=portfolio["tenancy"],
                created_by=owner.id,
                provider_id=provider_id,
                title="Synthetic job",
                description="Synthetic repair",
                status="assigned",
                cost=900000,
            )
            for provider_id in (provider.id, other.id)
        ]
        db.add_all(jobs)
        db.flush()
        job_id, hidden_id = [job.id for job in jobs]
        provider_id, other_id = provider.id, other.id
    sign_in(client, "provider@example.com")
    requests = client.get("/api/v1/provider-portal").json()["requests"]
    assert [job["id"] for job in requests] == [job_id]
    assert "cost" not in requests[0] and "email" not in requests[0]
    progress = dict(
        action="progress",
        status="in_progress",
        note="Synthetic progress",
        idempotency_key="synthetic-job-progress",
    )
    assert (
        client.post(f"/api/v1/provider-portal/requests/{hidden_id}", json=progress).status_code
        == 404
    )
    assert (
        client.post(f"/api/v1/provider-portal/requests/{job_id}", json=progress).status_code == 409
    )
    accept = dict(
        action="accept", note="Private scheduling detail", idempotency_key="synthetic-job-accept"
    )
    assert client.post(f"/api/v1/provider-portal/requests/{job_id}", json=accept).status_code == 200
    assert client.post(f"/api/v1/provider-portal/requests/{job_id}", json=accept).status_code == 200
    assert (
        client.post(
            f"/api/v1/provider-portal/requests/{job_id}", json={**accept, "note": "Changed"}
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"/api/v1/provider-portal/requests/{job_id}", json={**progress, "status": "closed"}
        ).status_code
        == 422
    )
    assert (
        client.post(f"/api/v1/provider-portal/requests/{job_id}", json=progress).status_code == 200
    )
    sign_in(client, "tenant@example.com")
    visible = client.get("/api/v1/maintenance").json()
    job = next(row for row in visible if row["id"] == job_id)
    assert job["provider_note"] is None and job["cost"] is None
    assert "Private scheduling detail" not in str(job["updates"])
    sign_in(client, "manager@example.com")
    assert client.post(f"/api/v1/providers/{provider_id}/invite").status_code == 403
    assert (
        client.post(
            f"/api/v1/maintenance/{job_id}",
            json={
                "status": "in_progress",
                "note": "Assigned another provider",
                "provider_id": other_id,
            },
        ).status_code
        == 200
    )
    sign_in(client, "provider@example.com")
    assert client.get("/api/v1/provider-portal").json()["requests"] == []
    assert (
        client.post(f"/api/v1/provider-portal/requests/{job_id}", json=progress).status_code == 404
    )
