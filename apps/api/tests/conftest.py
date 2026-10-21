import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

_directory = tempfile.TemporaryDirectory(prefix="jojobuilds-tests-")
os.environ["DATABASE_URL"] = "sqlite:///" + str(Path(_directory.name) / "test.db")
os.environ["DATA_DIR"] = str(Path(_directory.name) / "files")
os.environ["APP_ENV"] = "test"

from app import models as m  # noqa: E402
from app.auth import passwords  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def close_database():
    yield
    engine.dispose()
    _directory.cleanup()


@pytest.fixture(autouse=True)
def fresh_database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield


@pytest.fixture
def client():
    with TestClient(app) as connection:
        yield connection


@pytest.fixture
def portfolio(client):
    with SessionLocal.begin() as db:
        owner = m.User(
            email="owner@example.com",
            name="Synthetic Owner",
            password_hash=passwords.hash("synthetic-test-password"),
        )
        org = m.Organization(name="Synthetic Portfolio")
        db.add_all([owner, org])
        db.flush()
        db.add(m.Membership(org_id=org.id, user_id=owner.id, role="owner"))
        org_id = org.id
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@example.com", "password": "synthetic-test-password"},
    )
    assert login.status_code == 200, login.text
    client.headers.update({"X-CSRF-Token": login.json()["csrf"], "X-Organization": org_id})
    prop = client.post(
        "/api/v1/properties", json={"name": "Test Property", "location": "Nairobi"}
    ).json()["id"]
    unit = client.post(
        "/api/v1/units", json={"property_id": prop, "number": "A1", "default_rent": 4500000}
    ).json()["id"]
    tenant = client.post(
        "/api/v1/tenants", json={"name": "Synthetic Tenant", "email": "tenant@example.com"}
    ).json()["id"]
    tenancy = client.post(
        "/api/v1/tenancies",
        json={
            "unit_id": unit,
            "tenant_id": tenant,
            "reference": "JOJO-TEST",
            "rent": 4500000,
            "due_day": 31,
            "start_date": "2026-01-01",
        },
    )
    assert tenancy.status_code == 201, tenancy.text
    return {
        "org": org_id,
        "property": prop,
        "unit": unit,
        "tenant": tenant,
        "tenancy": tenancy.json()["id"],
    }
