import io
import json
from datetime import date

from openpyxl import Workbook

from app import models as m
from app.auth import passwords
from app.db import SessionLocal


def pay(client, portfolio, amount, key="payment-idempotency-0001"):
    return client.post(
        "/api/v1/payments",
        json={
            "tenancy_id": portfolio["tenancy"],
            "amount": amount,
            "received_on": str(date.today()),
            "reference": "SYNTHETIC",
            "method": "bank",
            "idempotency_key": key,
        },
    )


def test_partial_overpayment_idempotency_and_reversal(client, portfolio):
    for _ in range(2):
        result = client.post("/api/v1/billing/generate", json={"period": "2026-02"})
        assert result.status_code == 200, result.text
    charges = client.get("/api/v1/charges").json()
    assert len(charges) == 1
    assert charges[0]["due_date"] == "2026-02-28"
    payment = pay(client, portfolio, 2000000)
    assert payment.status_code == 201, payment.text
    assert pay(client, portfolio, 2000000).json()["id"] == payment.json()["id"]
    assert pay(client, portfolio, 2500000).status_code == 409
    assert client.get("/api/v1/charges").json()[0]["balance"] == 2500000
    overpayment = pay(client, portfolio, 3000000, "payment-idempotency-0002")
    assert overpayment.status_code == 201
    summary = client.get("/api/v1/dashboard?period=2026-02").json()
    assert summary["outstanding"] == 0
    assert summary["unallocated_credit"] == 500000
    assert (
        client.post(
            f"/api/v1/payments/{payment.json()['id']}/reverse",
            json={"reason": "Synthetic bank reversal"},
        ).status_code
        == 200
    )
    assert client.get("/api/v1/charges").json()[0]["balance"] == 2000000
    assert (
        client.post(
            f"/api/v1/payments/{payment.json()['id']}/reverse", json={"reason": "Repeat reversal"}
        ).status_code
        == 409
    )


MAPPING = {
    "date": "date",
    "amount": "amount",
    "description": "description",
    "reference": "reference",
}


def import_csv(client, portfolio, body, filename="statement.csv"):
    return client.post(
        "/api/v1/imports",
        data={
            "property_id": portfolio["property"],
            "account": "synthetic-account",
            "mapping": json.dumps(MAPPING),
        },
        files={"file": (filename, body, "text/csv")},
    )


def test_import_preview_duplicates_confirm_and_overlapping_files(client, portfolio):
    client.post("/api/v1/billing/generate", json={"period": "2026-02"})
    body = f"date,amount,description,reference\n{date.today()},10000,Rent JOJO-TEST,ABC1\n"
    first = import_csv(client, portfolio, body)
    assert first.status_code == 201, first.text
    assert not client.get("/api/v1/payments").json()
    assert import_csv(client, portfolio, body).json()["existing"] is True
    rows = client.get("/api/v1/reconciliation").json()
    assert rows[0]["suggestions"][0]["tenancy_id"] == portfolio["tenancy"]
    assert (
        client.post(
            f"/api/v1/reconciliation/{rows[0]['id']}",
            json={
                "action": "confirm",
                "tenancy_id": portfolio["tenancy"],
                "reason": "Checked source statement",
            },
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/v1/reconciliation/{rows[0]['id']}",
            json={
                "action": "confirm",
                "tenancy_id": portfolio["tenancy"],
                "reason": "Repeated confirmation",
            },
        ).status_code
        == 409
    )
    overlap = body + f"{date.today()},10000,Rent JOJO-TEST,ABC1\n"
    assert import_csv(client, portfolio, overlap).status_code == 201
    duplicates = client.get("/api/v1/reconciliation").json()
    assert len(duplicates) == 2
    assert all(r["status"] == "duplicate_review" for r in duplicates)
    assert len(client.get("/api/v1/payments").json()) == 1
    # A genuinely distinct identical-looking payment can be preserved explicitly.
    assert (
        client.post(
            f"/api/v1/reconciliation/{duplicates[0]['id']}",
            json={
                "action": "confirm",
                "tenancy_id": portfolio["tenancy"],
                "reason": "Confirmed distinct receipt with separate source evidence",
            },
        ).status_code
        == 200
    )
    assert len(client.get("/api/v1/payments").json()) == 2


def test_invalid_import_is_atomic_and_xlsx_preview_works(client, portfolio):
    bad = "date,amount,description,reference\n2026-02-01,10.001,Rent,ABC\n"
    response = import_csv(client, portfolio, bad)
    assert response.status_code == 422
    assert client.get("/api/v1/imports").json() == []
    book = Workbook()
    book.active.append(["date", "amount", "description", "reference"])
    book.active.append(["2026-02-01", 100, "Rent JOJO-TEST", "XLSX1"])
    stream = io.BytesIO()
    book.save(stream)
    response = client.post(
        "/api/v1/imports/preview",
        data={"mapping": json.dumps(MAPPING)},
        files={"file": ("statement.xlsx", stream.getvalue())},
    )
    assert response.status_code == 200, response.text
    assert response.json()["rows"][0]["amount"] == 10000


def test_csrf_organization_tenant_and_property_isolation(client, portfolio):
    csrf = client.headers.pop("X-CSRF-Token")
    assert pay(client, portfolio, 1000).status_code == 403
    client.headers["X-CSRF-Token"] = csrf
    with SessionLocal.begin() as db:
        other = m.Organization(name="Other Organization")
        db.add(other)
        db.flush()
        other_id = other.id
    client.headers["X-Organization"] = other_id
    assert client.get("/api/v1/properties").status_code == 403
    client.headers["X-Organization"] = portfolio["org"]
    with SessionLocal.begin() as db:
        user = m.User(
            email="tenant@example.com",
            name="Tenant",
            password_hash=passwords.hash("synthetic-test-password"),
        )
        db.add(user)
        db.flush()
        db.add(m.Membership(org_id=portfolio["org"], user_id=user.id, role="tenant"))
        tenant = db.get(m.Tenant, portfolio["tenant"])
        tenant.user_id = user.id
        other_tenant = m.Tenant(org_id=portfolio["org"], name="Another Tenant")
        db.add(other_tenant)
        db.flush()
        other_tenant_id = other_tenant.id
    client.post("/api/v1/auth/logout")
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "tenant@example.com", "password": "synthetic-test-password"},
    )
    client.headers["X-CSRF-Token"] = login.json()["csrf"]
    assert len(client.get("/api/v1/tenants").json()) == 1
    assert client.get("/api/v1/tenants").json()[0]["id"] != other_tenant_id
    assert pay(client, portfolio, 1000).status_code == 403
    assert client.get("/api/v1/imports").status_code == 403
    assert (
        client.post(
            "/api/v1/maintenance",
            json={
                "property_id": portfolio["property"],
                "tenancy_id": portfolio["tenancy"],
                "title": "Tap leaking",
                "description": "Synthetic plumbing issue",
            },
        ).status_code
        == 201
    )


def test_conflicting_tenancies_maintenance_and_revoked_session(client, portfolio):
    conflict = client.post(
        "/api/v1/tenancies",
        json={
            "unit_id": portfolio["unit"],
            "tenant_id": portfolio["tenant"],
            "reference": "JOJO-OTHER",
            "rent": 4500000,
            "start_date": "2026-03-01",
        },
    )
    assert conflict.status_code == 409
    result = client.post(
        "/api/v1/maintenance",
        json={
            "property_id": portfolio["property"],
            "title": "Tap leaking",
            "description": "Synthetic plumbing issue",
        },
    )
    request_id = result.json()["id"]
    assert (
        client.post(
            f"/api/v1/maintenance/{request_id}",
            json={
                "status": "closed",
                "note": "Invalid shortcut",
            },
        ).status_code
        == 422
    )
    for status in ("acknowledged", "in_progress", "resolved", "closed"):
        assert (
            client.post(
                f"/api/v1/maintenance/{request_id}",
                json={
                    "status": status,
                    "note": "Synthetic workflow update",
                },
            ).status_code
            == 200
        )
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.get("/api/v1/properties").status_code == 401


def test_attachment_access_and_mobile_session(client, portfolio):
    response = client.post(
        "/api/v1/attachments",
        data={
            "property_id": portfolio["property"],
            "tenancy_id": portfolio["tenancy"],
        },
        files={"file": ("test.pdf", b"%PDF-1.4\nSynthetic test fixture")},
    )
    assert response.status_code == 201, response.text
    attachment_id = response.json()["id"]
    assert client.get(f"/api/v1/attachments/{attachment_id}/download").status_code == 200
    assert (
        client.post(
            "/api/v1/attachments",
            data={
                "property_id": portfolio["property"],
            },
            files={"file": ("bad.png", b"<script>alert(1)</script>")},
        ).status_code
        == 422
    )
    mobile = client.post(
        "/api/v1/auth/mobile-login",
        json={
            "email": "owner@example.com",
            "password": "synthetic-test-password",
        },
    )
    assert mobile.status_code == 200
    token = mobile.json()["token"]
    client.cookies.clear()
    client.headers.pop("X-CSRF-Token")
    client.headers["Authorization"] = f"Bearer {token}"
    assert client.get("/api/v1/properties").status_code == 200
    assert pay(client, portfolio, 1000).status_code == 201
