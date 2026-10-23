from datetime import timedelta

import pytest
from sqlalchemy import func, select
from test_coordination import manager_and_tenant, sign_in, user

from app import models as m
from app import schemas as s
from app.db import SessionLocal
from app.routes_coordination import provider_action
from app.routes_messaging import contacts_for, start_conversation
from app.routes_service_work import submit_quote


def owner(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@example.com", "password": "synthetic-test-password"},
    )
    assert response.status_code == 200, response.text
    client.headers["X-CSRF-Token"] = response.json()["csrf"]
    return response.json()["user_id"]


@pytest.fixture
def operations(client, portfolio):
    manager_and_tenant(portfolio)
    with SessionLocal.begin() as db:
        provider_user = user(db, "provider@example.com", "Synthetic provider")
        outsider = user(db, "outsider@example.com", "Unassigned manager")
        other_org = m.Organization(name="Other landlord")
        db.add(other_org)
        db.flush()
        db.add(m.Membership(org_id=portfolio["org"], user_id=outsider.id, role="manager"))
        db.add(m.Membership(org_id=other_org.id, user_id=outsider.id, role="owner"))
        provider = m.ServiceProvider(
            org_id=portfolio["org"],
            name="Synthetic Plumbing",
            trade="Plumber",
            email=provider_user.email,
        )
        db.add(provider)
        db.flush()
        db.add(
            m.ProviderAccess(
                org_id=portfolio["org"], provider_id=provider.id, user_id=provider_user.id
            )
        )
        owner_user = db.scalar(select(m.User).where(m.User.email == "owner@example.com"))
        job = m.Maintenance(
            org_id=portfolio["org"],
            property_id=portfolio["property"],
            tenancy_id=portfolio["tenancy"],
            provider_id=provider.id,
            created_by=owner_user.id,
            title="Synthetic accepted repair",
            description="Synthetic repair",
            status="assigned",
            provider_response="accepted",
        )
        db.add(job)
        db.flush()
        return {
            **portfolio,
            "job": job.id,
            "provider": provider.id,
            "provider_user": provider_user.id,
            "owner_user": owner_user.id,
            "other_org": other_org.id,
        }


def contacts(client, org_id):
    response = client.get("/api/v1/messaging/contacts", params={"org_id": org_id})
    assert response.status_code == 200, response.text
    return response.json()


def start(client, org_id, contact, key="synthetic-conversation-key", body="Synthetic conversation"):
    return client.post(
        "/api/v1/conversations",
        json=dict(
            org_id=org_id,
            property_id=contact["property_id"],
            recipient_id=contact["user_id"],
            tenancy_id=contact["tenancy_id"],
            request_id=contact["request_id"],
            body=body,
            idempotency_key=key,
        ),
    )


def quotation(client, setup, key="synthetic-quotation-key", **changes):
    return client.post(
        f"/api/v1/provider-portal/requests/{setup['job']}/quotations",
        json={
            "items": [{"description": "Labour", "quantity": 2, "unit_price": 10000}],
            "terms_days": 7,
            "notes": "Synthetic quotation",
            "idempotency_key": key,
            **changes,
        },
    )


def review(client, document_id, decision="approve", note="Synthetic review"):
    return client.post(
        f"/api/v1/service-documents/{document_id}/review", json={"decision": decision, "note": note}
    )


def test_role_matrix_and_owner_oversight(client, operations):
    setup = operations
    sign_in(client, "manager@example.com")
    entries = contacts(client, setup["org"])
    assert {entry["role"] for entry in entries} == {"owner", "tenant", "service provider"}
    target = next(entry for entry in entries if entry["role"] == "tenant")
    first = start(client, setup["org"], target)
    assert first.status_code == 201, first.text
    conversation_id = first.json()["id"]
    assert start(client, setup["org"], target).json()["id"] == conversation_id
    assert start(client, setup["org"], target, body="Changed body").status_code == 409
    sign_in(client, "tenant@example.com")
    assert {entry["role"] for entry in contacts(client, setup["org"])} == {"owner", "manager"}
    reply = client.post(
        f"/api/v1/conversations/{conversation_id}/messages",
        json={"body": "Tenant reply", "idempotency_key": "synthetic-tenant-reply"},
    )
    assert reply.status_code == 200 and len(reply.json()["messages"]) == 2
    assert (
        client.post(
            "/api/v1/conversations",
            json=dict(
                org_id=setup["org"],
                property_id=setup["property"],
                recipient_id=setup["provider_user"],
                request_id=setup["job"],
                body="Not allowed",
                idempotency_key="synthetic-denied-contact",
            ),
        ).status_code
        == 403
    )
    owner(client)
    observed = client.get("/api/v1/conversations", params={"org_id": setup["org"]}).json()
    assert observed[0]["observer"] and observed[0]["messages"][-1]["body"] == "Tenant reply"
    assert client.get(f"/api/v1/conversations/{conversation_id}").status_code == 200
    assert (
        client.post(
            f"/api/v1/conversations/{conversation_id}/messages",
            json={
                "body": "Cannot impersonate participants",
                "idempotency_key": "synthetic-observer-reply",
            },
        ).status_code
        == 404
    )
    sign_in(client, "outsider@example.com")
    assert client.get("/api/v1/conversations", params={"org_id": setup["org"]}).json() == []
    assert client.get(f"/api/v1/conversations/{conversation_id}").status_code == 404
    client.headers["X-Organization"] = setup["other_org"]
    assert client.get(f"/api/v1/conversations/{conversation_id}").status_code == 404
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(m.ConversationMessage)) == 2
        assert db.scalar(select(func.count()).select_from(m.Notification)) == 2


def test_provider_messages_and_revocation_reassignment_boundaries(client, operations):
    setup = operations
    sign_in(client, "provider@example.com")
    entries = contacts(client, setup["org"])
    assert {entry["role"] for entry in entries} == {"owner", "manager"}
    assert all(entry["request_id"] == setup["job"] for entry in entries)
    target = next(entry for entry in entries if entry["role"] == "manager")
    thread = start(client, setup["org"], target)
    assert thread.status_code == 201, thread.text
    conversation_id = thread.json()["id"]
    sign_in(client, "manager@example.com")
    assert client.get(f"/api/v1/conversations/{conversation_id}").status_code == 200
    with SessionLocal.begin() as db:
        db.get(m.Maintenance, setup["job"]).provider_id = None
    assert client.get(f"/api/v1/conversations/{conversation_id}").status_code == 404
    owner(client)
    assert client.get(f"/api/v1/conversations/{conversation_id}").status_code == 200
    with SessionLocal.begin() as db:
        db.get(m.Maintenance, setup["job"]).provider_id = setup["provider"]
        db.scalar(select(m.ProviderAccess)).active = False
    sign_in(client, "provider@example.com")
    assert client.get(f"/api/v1/conversations/{conversation_id}").status_code == 403
    assert (
        client.get("/api/v1/messaging/contacts", params={"org_id": setup["org"]}).status_code == 403
    )
    assert quotation(client, setup).status_code == 404


def test_removed_assignments_and_tenant_memberships_remove_conversations(client, operations):
    setup = operations
    sign_in(client, "manager@example.com")
    target = next(entry for entry in contacts(client, setup["org"]) if entry["role"] == "tenant")
    thread_id = start(client, setup["org"], target).json()["id"]
    with SessionLocal.begin() as db:
        tenant = db.get(m.Tenant, setup["tenant"])
        db.scalar(select(m.Membership).where(m.Membership.user_id == tenant.user_id)).active = False
    assert client.get(f"/api/v1/conversations/{thread_id}").status_code == 404
    assert start(client, setup["org"], target, "synthetic-revoked-tenant").status_code == 403
    with SessionLocal.begin() as db:
        db.query(m.Assignment).delete()
    assert contacts(client, setup["org"]) == []


def test_quotation_invoice_one_liability_payments_and_reversal(client, operations):
    setup = operations
    sign_in(client, "provider@example.com")
    submitted = quotation(client, setup)
    assert submitted.status_code == 201, submitted.text
    quote = submitted.json()
    assert quote["amount"] == 20000 and quote["revision"] == 1
    assert quotation(client, setup).json()["id"] == quote["id"]
    assert quotation(client, setup, notes="Changed").status_code == 409
    assert quotation(client, setup, key="synthetic-another-quote").status_code == 409
    assert review(client, quote["id"]).status_code == 403
    owner(client)
    approved = review(client, quote["id"])
    assert approved.status_code == 200, approved.text
    payable_id = approved.json()["payable_id"]
    assert review(client, quote["id"]).json()["payable_id"] == payable_id
    assert review(client, quote["id"], decision="reject").status_code == 409
    bills = client.get("/api/v1/payables").json()
    assert len(bills) == 1 and bills[0]["balance"] == 20000
    issued = bills[0]["issued_on"]
    sign_in(client, "provider@example.com")
    invoice_payload = {
        "quote_id": quote["id"],
        "reference": "SYNTHETIC-INV-001",
        "issued_on": issued,
        "idempotency_key": "synthetic-invoice-key",
    }
    invoice = client.post(
        f"/api/v1/provider-portal/requests/{setup['job']}/invoices", json=invoice_payload
    )
    assert invoice.status_code == 201, invoice.text
    assert (
        client.post(
            f"/api/v1/provider-portal/requests/{setup['job']}/invoices", json=invoice_payload
        ).json()["id"]
        == invoice.json()["id"]
    )
    owner(client)
    approved_invoice = review(client, invoice.json()["id"])
    assert approved_invoice.status_code == 200, approved_invoice.text
    assert approved_invoice.json()["payable_id"] == payable_id
    assert len(client.get("/api/v1/payables").json()) == 1
    first_payment = client.post(
        f"/api/v1/payables/{payable_id}/payments",
        json={
            "amount": 5000,
            "paid_on": issued,
            "method": "bank",
            "idempotency_key": "synthetic-service-partial",
        },
    )
    assert first_payment.status_code == 200, first_payment.text
    payment_id = first_payment.json()["payments"][0]["id"]
    sign_in(client, "provider@example.com")
    service = client.get("/api/v1/provider-portal").json()["services"][0]
    assert (service["status"], service["paid"], service["balance"]) == (
        "partially_paid",
        5000,
        15000,
    )
    owner(client)
    assert (
        client.post(
            f"/api/v1/payables/{payable_id}/payments",
            json={
                "amount": 15000,
                "paid_on": issued,
                "method": "bank",
                "idempotency_key": "synthetic-service-remainder",
            },
        ).status_code
        == 200
    )
    sign_in(client, "provider@example.com")
    service = client.get("/api/v1/provider-portal").json()["services"][0]
    assert (service["status"], service["paid"], service["balance"]) == ("paid", 20000, 0)
    owner(client)
    assert (
        client.post(
            f"/api/v1/outgoing-payments/{payment_id}/reverse", json={"reason": "Synthetic reversal"}
        ).status_code
        == 200
    )
    sign_in(client, "provider@example.com")
    service = client.get("/api/v1/provider-portal").json()["services"][0]
    assert (service["status"], service["paid"], service["balance"]) == (
        "partially_paid",
        15000,
        5000,
    )
    with SessionLocal.begin() as db:
        db.get(m.Maintenance, setup["job"]).provider_id = None
    assert client.get("/api/v1/provider-portal").json()["services"][0]["id"] == payable_id


def test_rejected_revisions_and_role_financial_restrictions(client, operations):
    setup = operations
    sign_in(client, "provider@example.com")
    quote = quotation(client, setup).json()
    owner(client)
    assert review(client, quote["id"], "reject").status_code == 200
    sign_in(client, "provider@example.com")
    revised = quotation(
        client,
        setup,
        key="synthetic-revised-quote",
        items=[{"description": "Revised labour", "quantity": 1, "unit_price": 15000}],
    )
    assert revised.status_code == 201 and revised.json()["revision"] == 2
    quote = revised.json()
    sign_in(client, "manager@example.com")
    assert review(client, quote["id"]).status_code == 403
    work = client.get(f"/api/v1/maintenance/{setup['job']}/service-work")
    assert work.status_code == 200 and work.json()["documents"] == []
    sign_in(client, "tenant@example.com")
    assert client.get(f"/api/v1/maintenance/{setup['job']}/service-work").status_code == 403
    owner(client)
    assert review(client, quote["id"]).status_code == 200
    issued = client.get("/api/v1/payables").json()[0]["issued_on"]
    sign_in(client, "provider@example.com")
    payload = dict(
        quote_id=quote["id"],
        reference="SYNTHETIC-REVISE",
        issued_on=issued,
        idempotency_key="synthetic-first-invoice",
    )
    invoice = client.post(
        f"/api/v1/provider-portal/requests/{setup['job']}/invoices", json=payload
    ).json()
    owner(client)
    assert review(client, invoice["id"], "reject").status_code == 200
    sign_in(client, "provider@example.com")
    revised_invoice = client.post(
        f"/api/v1/provider-portal/requests/{setup['job']}/invoices",
        json={
            **payload,
            "reference": "SYNTHETIC-CORRECTED",
            "idempotency_key": "synthetic-revised-invoice",
        },
    )
    assert revised_invoice.status_code == 201 and revised_invoice.json()["revision"] == 2


def test_invalid_totals_assignment_and_voided_bill(client, operations):
    setup = operations
    sign_in(client, "provider@example.com")
    for items in (
        [],
        [{"description": "Zero", "quantity": 1, "unit_price": 0}],
        [{"description": "Fraction", "quantity": 1.5, "unit_price": 100}],
        [{"description": "Overflow", "quantity": 2, "unit_price": 1_000_000_000_000}],
        [{"description": "Whitespace", "quantity": True, "unit_price": 100}],
    ):
        assert quotation(client, setup, items=items).status_code == 422
    with SessionLocal.begin() as db:
        db.get(m.Maintenance, setup["job"]).provider_response = "pending"
    assert quotation(client, setup).status_code == 409
    with SessionLocal.begin() as db:
        db.get(m.Maintenance, setup["job"]).provider_response = "accepted"
    quote = quotation(client, setup).json()
    owner(client)
    approved = review(client, quote["id"]).json()
    bill = client.get("/api/v1/payables").json()[0]
    assert (
        client.post(
            f"/api/v1/payables/{approved['payable_id']}/void",
            json={"reason": "Synthetic cancellation"},
        ).status_code
        == 200
    )
    sign_in(client, "provider@example.com")
    payload = dict(
        quote_id=quote["id"],
        reference="SYNTHETIC-VOID",
        issued_on=bill["issued_on"],
        idempotency_key="synthetic-void-invoice",
    )
    assert (
        client.post(
            f"/api/v1/provider-portal/requests/{setup['job']}/invoices", json=payload
        ).status_code
        == 409
    )
    assert client.get("/api/v1/provider-portal").json()["services"][0]["status"] == "voided"


def test_pending_invoice_rechecks_reference_collision_and_reassignment(client, operations):
    setup = operations
    sign_in(client, "provider@example.com")
    quote = quotation(client, setup).json()
    owner(client)
    approved = review(client, quote["id"]).json()
    bill = client.get("/api/v1/payables").json()[0]
    sign_in(client, "provider@example.com")
    future = (m.now().date() + timedelta(days=2)).isoformat()
    payload = dict(
        quote_id=quote["id"],
        reference="SYNTHETIC-COLLISION",
        issued_on=future,
        idempotency_key="synthetic-reference-invoice",
    )
    assert (
        client.post(
            f"/api/v1/provider-portal/requests/{setup['job']}/invoices", json=payload
        ).status_code
        == 422
    )
    invoice = client.post(
        f"/api/v1/provider-portal/requests/{setup['job']}/invoices",
        json={**payload, "issued_on": bill["issued_on"]},
    ).json()
    owner(client)
    with SessionLocal.begin() as db:
        duplicate = m.Payable(
            org_id=setup["org"],
            property_id=setup["property"],
            provider_id=setup["provider"],
            kind="service",
            description="Other bill",
            reference=payload["reference"],
            amount=100,
            issued_on=m.now().date(),
            due_date=m.now().date(),
            created_by=setup["owner_user"],
            idempotency_key="synthetic-collision-bill",
        )
        db.add(duplicate)
    assert review(client, invoice["id"]).status_code == 409
    with SessionLocal.begin() as db:
        db.scalar(
            select(m.Payable).where(m.Payable.id != approved["payable_id"])
        ).reference = "OTHER"
        db.get(m.Maintenance, setup["job"]).provider_id = None
    assert review(client, invoice["id"]).status_code == 409
    assert review(client, invoice["id"], "reject").status_code == 200


def test_service_money_stays_with_provider_and_finance_cannot_review(client, operations):
    setup = operations
    with SessionLocal.begin() as db:
        finance_user = user(db, "finance@example.com")
        finance_member = m.Membership(org_id=setup["org"], user_id=finance_user.id, role="finance")
        db.add(finance_member)
        db.flush()
        db.add(m.Assignment(membership_id=finance_member.id, property_id=setup["property"]))
        other_provider = m.ServiceProvider(
            org_id=setup["org"], name="Other supplier", trade="Electrical"
        )
        db.add(other_provider)
        db.flush()
        for kind, provider_id in (("service", other_provider.id), ("owner_use", setup["provider"])):
            db.add(
                m.Payable(
                    org_id=setup["org"],
                    property_id=setup["property"],
                    kind=kind,
                    provider_id=provider_id,
                    description="Private unrelated bill",
                    amount=99999,
                    issued_on=m.now().date(),
                    due_date=m.now().date(),
                    created_by=setup["owner_user"],
                    idempotency_key=f"synthetic-private-{kind}",
                )
            )
    sign_in(client, "provider@example.com")
    quote = quotation(client, setup).json()
    assert client.get("/api/v1/provider-portal").json()["services"] == []
    assert client.get("/api/v1/payables").status_code == 403
    assert client.get(f"/api/v1/maintenance/{setup['job']}/service-work").status_code == 403
    sign_in(client, "finance@example.com")
    assert review(client, quote["id"]).status_code == 403
    assert (
        client.get(f"/api/v1/maintenance/{setup['job']}/service-work").json()["documents"][0][
            "amount"
        ]
        == 20000
    )
    owner(client)
    client.headers["X-Organization"] = setup["other_org"]
    assert review(client, quote["id"]).status_code in (403, 404)
    client.headers["X-Organization"] = setup["org"]
    assert review(client, quote["id"]).status_code == 200
    sign_in(client, "provider@example.com")
    services = client.get("/api/v1/provider-portal").json()["services"]
    assert len(services) == 1 and services[0]["amount"] == 20000


def test_write_handlers_persist_before_returning_for_immediate_refresh(client, operations):
    setup = operations
    with SessionLocal.begin() as db:
        db.get(m.Maintenance, setup["job"]).provider_response = "pending"
    with SessionLocal() as writer:
        provider = writer.get(m.User, setup["provider_user"])
        provider_action(
            setup["job"],
            s.ProviderActionIn(
                action="accept",
                note="Synthetic acceptance",
                idempotency_key="synthetic-visible-accept",
            ),
            (provider, None),
            writer,
        )
        with SessionLocal() as reader:
            assert reader.get(m.Maintenance, setup["job"]).provider_response == "accepted"
        quote = submit_quote(
            setup["job"],
            s.QuotationIn(
                items=[s.QuoteItem(description="Labour", quantity=1, unit_price=1000)],
                idempotency_key="synthetic-visible-quotation",
            ),
            (provider, None),
            writer,
        )
        with SessionLocal() as reader:
            assert reader.get(m.ServiceDocument, quote["id"]) is not None
        target = contacts_for(writer, provider, setup["org"])[0]
        thread = start_conversation(
            s.ConversationStart(
                org_id=setup["org"],
                property_id=target.property_id,
                recipient_id=target.user_id,
                request_id=target.request_id,
                body="Synthetic persisted message",
                idempotency_key="synthetic-visible-message",
            ),
            (provider, None),
            writer,
        )
        with SessionLocal() as reader:
            assert (
                reader.scalar(
                    select(m.ConversationMessage).where(
                        m.ConversationMessage.conversation_id == thread["id"]
                    )
                ).body
                == "Synthetic persisted message"
            )
