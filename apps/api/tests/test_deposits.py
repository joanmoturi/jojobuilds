from datetime import date


def test_deposit_receipts_do_not_settle_rent_or_inflate_collection(client, portfolio):
    assert client.post("/api/v1/billing/generate", json={"period": "2026-02"}).status_code == 200
    assert (
        client.post(
            "/api/v1/charges",
            json={
                "tenancy_id": portfolio["tenancy"],
                "kind": "deposit",
                "period": "2026-02",
                "description": "Agreed deposit",
                "amount": 4500000,
                "due_date": "2026-02-01",
            },
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/api/v1/payments",
            json={
                "tenancy_id": portfolio["tenancy"],
                "amount": 4500000,
                "received_on": str(date.today()),
                "method": "bank",
                "purpose": "deposit",
                "idempotency_key": "synthetic-deposit-0001",
            },
        ).status_code
        == 201
    )
    charges = client.get("/api/v1/charges").json()
    assert next(c for c in charges if c["kind"] == "deposit")["balance"] == 0
    assert next(c for c in charges if c["kind"] == "rent")["balance"] == 4500000
    dashboard = client.get("/api/v1/dashboard?period=2026-02").json()
    assert dashboard["allocated"] == 0
    assert dashboard["unallocated_credit"] == 0
