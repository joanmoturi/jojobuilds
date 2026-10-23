# JOJOBUILDS API reference

This is a navigation and integration guide for the implemented API, not a
separate hand-maintained schema. See the checked-in
[OpenAPI contract](../packages/api-client/openapi.json) for exact request and
response fields, required values and status codes.

## Base address and authentication

The API prefix is `/api/v1`. Locally, FastAPI runs at
`http://127.0.0.1:8000`; the website proxies `/api/v1` on its own origin.
Interactive API documentation is available at `http://127.0.0.1:8000/docs`
outside production.

| Client         | Session flow                                                                                                                                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Website        | `POST /auth/login` sets an opaque HTTP-only session cookie. `GET /auth/session` returns the current account, memberships and CSRF value. Browser writes require the session CSRF value in `X-CSRF-Token` and a trusted Origin. |
| Native Android | `POST /auth/mobile-login` returns a separate opaque bearer token. Send it as `Authorization: Bearer <token>` and keep it in secure device storage, not source or logs.                                                         |

Send `X-Organization` with the selected organization ID on scoped requests.
It selects among active memberships; it never grants membership. Do not rely
on the server's default membership choice for a multi-workspace client.
Use `POST /auth/logout` to end the current session.

All paths below are relative to `/api/v1`. A UUID placeholder must be replaced
with an ID obtained from an authorized response.

## Properties, units and agreements

| Method     | Path                          | Purpose / access                                                                                                                                                                                 |
| ---------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET        | `/properties`                 | Visible property summaries; optional `q`. Tenant counts cover only their linked units.                                                                                                           |
| POST       | `/properties`                 | Create a property; owner only.                                                                                                                                                                   |
| PUT        | `/properties/{property_id}`   | Edit an authorized property; owner only.                                                                                                                                                         |
| GET        | `/units`                      | Visible unit specifications/default prices; optional `property_id`. Tenants receive only their linked units.                                                                                     |
| POST       | `/units`                      | Create a unit; owner only.                                                                                                                                                                       |
| PUT        | `/units/{unit_id}`            | Edit specification/default price without moving the unit or changing existing lease rent.                                                                                                        |
| GET / POST | `/tenants`                    | List authorized tenant records / register a tenant with tenant-management permission. Caretakers/maintenance cannot read the directory; managers use scoped reminder contacts without mutations. |
| GET / POST | `/tenancies`                  | Read authorized agreement history / start a tenancy with tenant-management permission. Financial tenancy reads exclude manager/caretaker/maintenance roles.                                      |
| POST       | `/tenancies/{tenancy_id}/end` | End an authorized agreement with an end date and reason.                                                                                                                                         |
| GET        | `/rentals`                    | Tenant-only unit-based account view, one record per own agreement.                                                                                                                               |
| GET        | `/maintenance-options`        | Scoped active tenant/unit labels without tenant-ledger amounts.                                                                                                                                  |

Example unit creation, or full unit update payload:

```json
{
  "property_id": "PROPERTY_UUID",
  "number": "S01",
  "building": "Main",
  "floor": "Ground",
  "usage": "commercial",
  "unit_type": "Rental stall",
  "default_rent": 1500000
}
```

`usage` is `residential` or `commercial`; `unit_type` is a free-text specification.
`number` is the unit label, not necessarily a number. Its combination with
building and property must be unique. A full PUT must retain the existing
`property_id`; moving a unit is rejected. Send all current fields you intend to
preserve: omitted optional input fields take their schema defaults, rather than
acting as a partial PATCH. Existing unit records migrate with
Residential usage and can be reviewed through the edit workflow.

`GET /rentals` joins the caller's agreements to unit/location/contact details
and supplies agreed `rent`, currency, non-deposit `outstanding` and `overdue`.
It includes ended agreements but never a later occupant's charges. These are
all-date balances, not amounts filtered to the selected reporting month.
No building-wide occupancy fields are returned in this rental view.

## Operations, messages and provider access

| Method     | Path                                     | Purpose / access                                                                                                                                 |
| ---------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET        | `/tenant-balances`                       | Owner/manager assigned-tenant non-deposit outstanding/overdue totals and contact labels, not rent/deposit/receipt details.                       |
| GET / POST | `/tenant-messages`                       | Owners/managers read/send within scope; tenants read only their own messages. POST takes tenancy, subject, body, email preference and retry key. |
| POST       | `/providers/{provider_id}/invite`        | Owner-only invitation to the saved provider email; queued in the normal mail outbox.                                                             |
| POST       | `/providers/{provider_id}/revoke`        | Owner-only immediate link revocation and pending-invitation invalidation.                                                                        |
| GET        | `/provider-portal`                       | Authenticated account's active linked landlords and assigned jobs, independent of `X-Organization`. No membership is required.                   |
| POST       | `/provider-portal/requests/{request_id}` | Assigned provider accepts/declines or, after acceptance, updates progress; `action`, optional progress `status`, required `note` and retry key.  |
| GET        | `/auth/google/status`                    | Reports configured availability without disclosing credentials.                                                                                  |
| POST       | `/auth/google/start`                     | Begin Google sign-in; optional `invitation` token. Returns an authorization URL and binds a short-lived browser cookie.                          |
| POST       | `/auth/google/link`                      | Explicit authenticated, CSRF-protected Google linking for an existing account.                                                                   |
| GET        | `/auth/google/callback`                  | Single-use browser-bound OAuth completion, not a client API for accepting identity claims.                                                       |

`SessionOut.provider_access` allows provider-only accounts to have an empty
`organizations` list. Provider invitations use normal redeem/accept-invitation
endpoints without creating or replacing an organization membership. Provider
job notes never include structured financial fields. Acceptance/decline response
notes are staff-private; progress notes are tenant-visible. Providers cannot
reassign or close jobs. Quotations and invoices use separate scoped routes below.

| Method | Path                                          | Purpose / access                                                                                                                         |
| ------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/messaging/contacts?org_id=...`              | Eligible recipient/property/rental/job contexts, derived from current access.                                                            |
| GET    | `/conversations?org_id=...&request_id=...`    | Own currently authorized conversations; owners see all property conversations. Optional job filter.                                      |
| POST   | `/conversations`                              | Start/send using `org_id`, `property_id`, `recipient_id`, matching optional `tenancy_id` or `request_id`, `body`, and `idempotency_key`. |
| GET    | `/conversations/{id}`                         | Authorized transcript; owner oversight allowed.                                                                                          |
| POST   | `/conversations/{id}/messages`                | Participant reply with `body` and `idempotency_key`; owner observers cannot write.                                                       |
| GET    | `/provider-portal/requests/{id}/service-work` | Assigned provider's own quotation/invoice history for the job.                                                                           |
| GET    | `/maintenance/{id}/service-work`              | Scoped owner/finance document history; manager receives no financial documents.                                                          |
| POST   | `/provider-portal/requests/{id}/quotations`   | Accepted open job: `items` (`description`, whole `quantity`, minor-unit `unit_price`), `terms_days`, optional `notes`, retry key.        |
| POST   | `/provider-portal/requests/{id}/invoices`     | Accepted job: approved `quote_id`, `reference`, `issued_on`, optional `notes`, retry key.                                                |
| POST   | `/service-documents/{id}/review`              | Owner only: `decision` (`approve`/`reject`) and required `note`.                                                                         |

Quotation/invoice revisions are immutable. Only rejected documents can be revised.
The API calculates totals; invoice items and total come from the approved quote.
Quote approval creates one ordinary unpaid service payable; invoice approval
links that payable. Recorded payment/reversal totals drive provider service status.
`/provider-portal.services` contains only the linked provider's service bills,
with `awaiting_payment`, `partially_paid`, `paid`, or `voided` status and payment
history. Landlord entries include their currency. There are no bank transfers.

The shared inbox recipient/oversight matrix is documented in
[Authorization](AUTHORIZATION.md#provider-portal-and-messaging). Shared message
retry keys are sender-wide; changed retries return 409. Access is rechecked after
revocation or job reassignment. Shared messages are in-app only; the following
channel statuses apply to legacy tenant notices.

Message results report `in_app` and `email_status`: `queued`, `not_configured`,
`no_address` or `not_requested`. No available delivery channel produces 422.
Exact retries retain the original message/job event; changed retry payloads
produce 409. Requests outside the assignment/tenant scope do not reveal records.
Managers cannot read `/tenancies` or financial endpoints, edit agreements, or
set maintenance `cost`; omitting cost preserves its existing value.

## Incoming tenant money and billing

| Method     | Path                             | Purpose                                                                               |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| GET        | `/dashboard?period=2026-10`      | Authorized period summary.                                                            |
| GET / POST | `/charges`                       | Read authorized charges / create an explicit bill with finance permission.            |
| GET / POST | `/payments`                      | Read authorized receipts / record an actual reviewed receipt with finance permission. |
| POST       | `/payments/{payment_id}/reverse` | Preserve and reverse a receipt with a reason.                                         |
| POST       | `/billing/generate`              | Generate eligible rent and recurring charges for `{"period":"2026-10"}`.              |
| GET        | `/recurring-charges`             | Read scoped rules; tenants may read their own.                                        |
| POST       | `/recurring-charges`             | Create a fixed extra-charge rule with finance permission.                             |
| PUT        | `/recurring-charges/{rule_id}`   | Edit/deactivate a rule; tenancy and type cannot be changed.                           |
| GET        | `/exports/ledger.csv`            | Export the authorized ledger, not just a frontend rental filter.                      |

Managers, caretakers, maintenance staff and agents cannot read tenant charge/payment
ledgers. The tenant role reads only its own records and cannot create or
approve financial entries.

Example recurring-rule request:

```json
{
  "tenancy_id": "TENANCY_UUID",
  "kind": "garbage",
  "description": "Synthetic monthly stall garbage",
  "amount": 50000,
  "due_day": 5,
  "start_period": "2026-10",
  "end_period": null,
  "active": true
}
```

A rule is not a bill. Generation creates ordinary charges. There is one rule
per tenancy/type, and one charge per tenancy/month/type. Updating a rule never
rewrites generated charges. A manual bill and a recurring rule of the same
type do not create two monthly charges. See [Financial model](FINANCIAL_MODEL.md)
for date eligibility, partial periods, allocation and deposit rules.

## Providers, outgoing money and private owner entries

| Method     | Path                                      | Purpose / access                                                                                                    |
| ---------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| GET        | `/providers`                              | Owner/manager/finance/caretaker/maintenance contact directory. Non-finance staff receive null financial aggregates. |
| POST / PUT | `/providers` / `/providers/{provider_id}` | Create/edit/archive a provider; owner only.                                                                         |
| GET / POST | `/payables`                               | Read/create authorized service or operating bills; private categories require owner.                                |
| POST       | `/payables/{payable_id}/payments`         | Record an actual outgoing payment; no transfer is performed.                                                        |
| POST       | `/payables/{payable_id}/void`             | Void an unpaid incorrect bill with a reason.                                                                        |
| POST       | `/outgoing-payments/{payment_id}/reverse` | Preserve and reverse an outgoing record with a reason.                                                              |
| GET        | `/owner-finances?period=2026-10`          | Owner-only recorded cash movement and obligation totals.                                                            |

Payable kinds are `service`, `operating`, `tax`, `loan` and `owner_use`.
Service bills require a provider and property; an optional maintenance job
must match the property/provider. Operating costs require a property. Tax,
loan and owner-use entries remain owner-only even when property-linked.

Example outgoing-payment request, after paying outside the application:

```json
{
  "amount": 100000,
  "paid_on": "2026-10-22",
  "method": "bank",
  "reference": "SYNTHETIC-PROVIDER-PARTIAL",
  "idempotency_key": "synthetic-outgoing-payment-0001"
}
```

The example records KES 1,000, not KES 100,000. Use the actual payment date;
future payments, dates before the bill's issue date and overpayments are
rejected. Methods are `bank`, `mpesa`, `cash` or `cheque`. M-Pesa is a manual
recording method, not Daraja confirmation.

## Contract rules and failures

- Receipt, charge and bill amounts are positive integer minor units:
  KES 500.00 is `50000`. An agreed deposit may be zero. Currency is
  organization-scoped; do not use floating-point major-unit amounts in API bodies.
- Use a stable, unique `idempotency_key` for `POST /payments`,
  `POST /payables` and `POST /payables/{payable_id}/payments`. Exact retries
  reuse the record; a different payload with the same key is rejected.
  Do not generate a new key solely because a request timed out.
- Financial corrections use reversals or unpaid-bill voids, not deletion.
  Outgoing payments are separate from tenant receipts and never settle rent.
- Business dates use the portfolio timezone. Periods use `YYYY-MM` and dates
  use `YYYY-MM-DD`. Do not convert a date-only field through UTC midnight.
- A `401` requires sign-in; `403` means the role/action is forbidden. Scoped
  records may return `404` instead of revealing inaccessible data. `409`
  indicates a conflict/duplicate; `422` indicates invalid input or a business
  rule violation. Display errors and preserve the user's retry context.
- Lists are bounded and do not provide a complete pagination UI. Do not
  calculate organization-wide balances from a truncated list; use the backend
  summary endpoints and document each summary's date scope.

Owner cash movement excludes deposit receipts. Its inflows/outflows are selected
by payment date; outstanding obligations span all dates. It is not a bank balance,
tax filing or full accounting profit.

## Source and maintenance

| Concern                                           | Source                                   |
| ------------------------------------------------- | ---------------------------------------- |
| Authentication / scope                            | `apps\api\app\auth.py`, `routes_auth.py` |
| Properties, units, agreements, rentals            | `apps\api\app\routes_core.py`            |
| Tenant receipts, imports, reconciliation, exports | `apps\api\app\routes_finance.py`         |
| Providers, payable rules and owner summaries      | `apps\api\app\routes_payables.py`        |
| Maintenance and private files                     | `apps\api\app\routes_operations.py`      |
| Request/response definitions                      | `apps\api\app\schemas.py`                |
| Shared generated contract                         | `packages\api-client`                    |

After backend schema changes, run `npm run api:generate` from the repository
root and check affected clients. Apply Alembic migrations before serving changed
models. See [Operations](OPERATIONS_RUNBOOK.md), [Authorization](AUTHORIZATION.md),
[Testing](TESTING.md) and [Backup/restore](BACKUP_AND_RESTORE.md).
