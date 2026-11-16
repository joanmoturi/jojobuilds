import pytest

from app import models as m
from app.auth import passwords
from app.db import SessionLocal


def test_company_and_building_channels_persist_without_wiping_legacy_contacts(client, portfolio):
    response = client.put(
        "/api/v1/organization-contact",
        json={
            "name": "Synthetic contact company",
            "call_phone": "+254 (700) 000-101",
            "sms_phone": "+254700000102",
            "whatsapp_phone": "+254700000103",
        },
    )
    assert response.status_code == 200, response.text
    assert client.get("/api/v1/organization-contact").json()["call_phone"] == "+254700000101"
    path = f"/api/v1/properties/{portfolio['property']}"
    data = {
        "name": "Test Property",
        "location": "Nairobi",
        "contact": "Synthetic office",
        "whatsapp_phone": "+254700000104",
    }
    assert client.put(path, json=data).status_code == 200
    # Older clients still submit name/location/contact without channel fields.
    del data["whatsapp_phone"]
    assert client.put(path, json=data).status_code == 200
    property_view = client.get("/api/v1/properties").json()[0]
    assert property_view["whatsapp_phone"] == "+254700000104"
    assert property_view["contact"] == "Synthetic office"
    assert client.put(path, json={**data, "whatsapp_phone": ""}).status_code == 200
    assert client.get("/api/v1/properties").json()[0]["whatsapp_phone"] == ""


@pytest.mark.parametrize(
    "value",
    [
        "0712345678",
        "https://example.test",
        "+2547?text=private",
        "+00000000",
        "+254700000001;ext=12",
    ],
)
def test_contact_channels_reject_noninternational_numbers_and_link_injection(
    client, portfolio, value
):
    assert (
        client.put(
            "/api/v1/organization-contact", json={"name": "Synthetic", "whatsapp_phone": value}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/properties",
            json={"name": "Synthetic", "location": "Example", "sms_phone": value},
        ).status_code
        == 422
    )


def test_tenant_contacts_are_scoped_and_only_owner_can_change_them(client, portfolio):
    assert (
        client.put(
            "/api/v1/organization-contact",
            json={"name": "Synthetic company", "call_phone": "+254700000101"},
        ).status_code
        == 200
    )
    with SessionLocal.begin() as db:
        prop = db.get(m.Property, portfolio["property"])
        prop.whatsapp_phone = "+254700000102"
        user = m.User(
            email="contact-tenant@example.com",
            name="Synthetic Tenant",
            password_hash=passwords.hash("synthetic-contact-password"),
        )
        other_org = m.Organization(name="Other company", call_phone="+254700000199")
        db.add_all([user, other_org])
        db.flush()
        other_org_id = other_org.id
        hidden = m.Property(
            org_id=portfolio["org"],
            name="Unrelated building",
            location="Example",
            whatsapp_phone="+254700000198",
        )
        db.add(hidden)
        db.flush()
        hidden_id = hidden.id
        db.get(m.Tenant, portfolio["tenant"]).user_id = user.id
        db.add(m.Membership(org_id=portfolio["org"], user_id=user.id, role="tenant"))
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "contact-tenant@example.com", "password": "synthetic-contact-password"},
    )
    client.headers["X-CSRF-Token"] = login.json()["csrf"]
    assert client.get("/api/v1/organization-contact").json()["call_phone"] == "+254700000101"
    properties = client.get("/api/v1/properties").json()
    assert [prop["id"] for prop in properties] == [portfolio["property"]]
    assert properties[0]["whatsapp_phone"] == "+254700000102"
    assert client.get("/api/v1/rentals").json()[0]["whatsapp_phone"] == "+254700000102"
    assert (
        client.put("/api/v1/organization-contact", json={"name": "Unauthorized change"}).status_code
        == 403
    )
    assert (
        client.put(
            f"/api/v1/properties/{hidden_id}", json={"name": "Unauthorized", "location": "Example"}
        ).status_code
        == 403
    )
    client.headers["X-Organization"] = other_org_id
    assert client.get("/api/v1/organization-contact").status_code == 403


@pytest.mark.parametrize("role", ["manager", "finance", "agent", "caretaker", "maintenance"])
def test_staff_cannot_change_company_contacts(client, portfolio, role):
    with SessionLocal.begin() as db:
        user = m.User(
            email=f"{role}@example.com",
            name="Synthetic Staff",
            password_hash=passwords.hash("synthetic-contact-password"),
        )
        db.add(user)
        db.flush()
        db.add(m.Membership(org_id=portfolio["org"], user_id=user.id, role=role))
    login = client.post(
        "/api/v1/auth/login",
        json={"email": f"{role}@example.com", "password": "synthetic-contact-password"},
    )
    client.headers["X-CSRF-Token"] = login.json()["csrf"]
    assert (
        client.put("/api/v1/organization-contact", json={"name": "Unauthorized"}).status_code == 403
    )
