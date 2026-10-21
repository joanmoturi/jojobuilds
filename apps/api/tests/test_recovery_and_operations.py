from concurrent.futures import ThreadPoolExecutor
from zipfile import ZipFile

import pytest
from sqlalchemy import select

from app import models as m
from app.auth import passwords
from app.cli import backup, restore
from app.db import SessionLocal


def test_single_use_recovery_revokes_existing_sessions(client, portfolio):
    response = client.post("/api/v1/auth/recover", json={"email": "owner@example.com"})
    assert response.status_code == 200
    with SessionLocal() as db:
        mail = db.scalar(select(m.Mail))
        token = mail.body.split("?reset=")[1].split()[0]
    redeem = {"token": token, "name": "Owner", "password": "new-synthetic-password"}
    assert client.post("/api/v1/auth/redeem", json=redeem).status_code == 200
    assert client.get("/api/v1/properties").status_code == 401
    assert client.post("/api/v1/auth/redeem", json=redeem).status_code == 422
    assert (
        client.post(
            "/api/v1/auth/login",
            json={
                "email": "owner@example.com",
                "password": "new-synthetic-password",
            },
        ).status_code
        == 200
    )


def test_assigned_caretaker_cannot_read_money_or_private_tenant_documents(client, portfolio):
    document = client.post(
        "/api/v1/attachments",
        data={
            "property_id": portfolio["property"],
            "tenancy_id": portfolio["tenancy"],
        },
        files={"file": ("lease.pdf", b"%PDF-1.4\nSynthetic lease")},
    ).json()["id"]
    with SessionLocal.begin() as db:
        staff = m.User(
            email="staff@example.com",
            name="Synthetic Caretaker",
            password_hash=passwords.hash("synthetic-test-password"),
        )
        db.add(staff)
        db.flush()
        member = m.Membership(org_id=portfolio["org"], user_id=staff.id, role="caretaker")
        db.add(member)
        db.flush()
        db.add(m.Assignment(membership_id=member.id, property_id=portfolio["property"]))
    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "staff@example.com",
            "password": "synthetic-test-password",
        },
    )
    client.headers["X-CSRF-Token"] = login.json()["csrf"]
    assert client.get("/api/v1/properties").json()[0]["collected"] is None
    assert client.get("/api/v1/charges").status_code == 403
    assert client.get("/api/v1/tenants").status_code == 403
    assert client.get(f"/api/v1/attachments/{document}/download").status_code == 404
    assert client.get("/api/v1/attachments").json() == []


def test_simultaneous_payment_retry_does_not_duplicate(client, portfolio):
    data = dict(
        tenancy_id=portfolio["tenancy"],
        amount=1000,
        received_on="2026-01-01",
        method="bank",
        idempotency_key="concurrent-synthetic-payment",
    )
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: client.post("/api/v1/payments", json=data), range(2)))
    assert all(response.status_code == 201 for response in responses), [r.text for r in responses]
    assert responses[0].json()["id"] == responses[1].json()["id"]
    assert len(client.get("/api/v1/payments").json()) == 1


def test_backup_restore_is_lossless_and_does_not_overwrite(client, portfolio, tmp_path):
    archive = tmp_path / "backup.zip"
    backup(archive)
    destination = tmp_path / "restored"
    restore(archive, destination)
    import sqlite3

    with sqlite3.connect(destination / "database.db") as db:
        assert db.execute("SELECT COUNT(*) FROM tenancies").fetchone()[0] == 1
    with pytest.raises(SystemExit, match="never overwritten"):
        restore(archive, destination)
    evil = tmp_path / "unexpected.zip"
    with ZipFile(archive) as original, ZipFile(evil, "w") as target:
        for name in original.namelist():
            target.writestr(name, original.read(name))
        target.writestr("../outside", "no")
    with pytest.raises(SystemExit, match="unexpected"):
        restore(evil, tmp_path / "rejected")
