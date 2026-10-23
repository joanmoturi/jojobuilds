# Architecture

JOJOBUILDS is a modular monolith with two API clients:

```text
Next.js browser -> same-origin /api/v1 proxy -> FastAPI -> SQLAlchemy -> PostgreSQL
Expo Android   -> /api/v1 + opaque bearer   -> FastAPI -> private file storage
```

SQLite is an explicit local-only alternative when PostgreSQL is unavailable.
There is no Supabase dependency, duplicate mobile ledger or external payment
provider required to start. The backend owns amounts, allocation and permissions.

`routes_auth`, `routes_core`, `routes_finance`, `routes_operations` and
`routes_payables` are HTTP boundaries. `ledger` owns incoming-payment allocation
and monthly charge generation; `imports` parses observations. `routes_payables`
handles scoped provider/owner obligations and separate outgoing-payment
transactions. `auth` owns scoped authorization. Models are SQLAlchemy 2 mapped classes.
`routes_coordination` supplies manager balances/messages and the provider portal;
`routes_messaging` supplies property-scoped two-person conversations and owner
oversight. `routes_service_work` supplies immutable quotations/invoices and
owner reviews, reusing ordinary payables/outgoing payments rather than a second
financial ledger.
`routes_google` supplies optional browser-bound Google login/linking. Provider
access links are independent of staff memberships so a single identity can work
for several landlords without receiving organization-wide access.
The shared API package contains checked-in OpenAPI and generated schema types.
`npm run api:generate` refreshes them without requiring a running server.

The website uses Tailwind infrastructure with custom semantic CSS and lucide
icons. Forms use React Hook Form, native constraints, Zod and backend validation.
The native application uses Expo Router, SecureStore and TanStack Query.

No Redis, Kubernetes, paid service or remote imagery is required. Email is an
explicitly processed database outbox. Push and payment adapters are unconfigured.
Scheduling is an operator-run billing command; no daemon is silently installed.

## Unit-based rentals

Properties are locations; units carry a label, residential/commercial usage,
free-text specification and default monthly price. A tenancy links one tenant
identity to one unit with its own agreed rent, dates and payment reference.
The active-tenancy uniqueness constraint applies to the unit, not the tenant.
One person can therefore rent an apartment, stall and bar without duplicate
tenant records.

The owner/staff Properties view shows unit specifications, assigned tenants and
authorized bill controls. The tenant website uses `/rentals`, a tenant-only
read model joining each own agreement to unit/location details and own
non-deposit balances. It is not a building-occupancy summary. History remains
scoped by agreement even when a later occupant rents the same unit.

The frontend rental-account selector filters visible invoices/receipts; server
authorization independently scopes every API resource. Tenant ledger export is
all authorized agreements, not the screen filter.

## Financial and privacy boundaries

Unit metadata/default-price edits do not change existing tenancy rents or
generated charges. Recurring extra-charge rules generate ordinary tenant bills.
Tenant receipts allocate within the individual tenancy; deposits are separate.

Provider bills and owner obligations use `payables` and `outgoing_payments`, not
tenant allocations. Tax, loan and owner-use records are owner-only. A property
link never converts a private owner entry into a staff-visible operating cost.
Maintenance cost is reference data, not another cash outflow.
Managers cannot obtain rent/deposit details or financial ledgers, exports or
payables; their dedicated balance read model returns reminder totals only.
Providers receive assigned-job/contact DTOs without financial fields.
Messages persist delivery-channel status and use the existing notification/mail
outboxes. Google identities use immutable subjects, explicit existing-account
linking and invitation-only provisioning; no provider tokens are retained.

Owner cash movement is a period-based report over recorded receipts and outgoing
payments, not a bank integration or full accounting journal. Exact retry keys,
transaction locks and retained reversal records protect supported financial
mutations.

## Maintaining the implementation

Apply Alembic migrations before serving changed models. After schema changes,
regenerate the shared contract and check the affected web/native consumers.
Use the [API reference](API_REFERENCE.md) to find endpoint groups and contract
examples, [Authorization](AUTHORIZATION.md) for role/scope rules and
[Testing](TESTING.md) for actual coverage and unverified environments.

See ADR 0001, FINANCIAL_MODEL and SECURITY for tradeoffs. Container definitions
are supplied but cannot be marked tested without Docker.
