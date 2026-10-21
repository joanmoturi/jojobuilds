# Architecture

JOJOBUILDS is a modular monolith with two API clients:

```text
Next.js browser -> same-origin /api/v1 proxy -> FastAPI -> SQLAlchemy -> PostgreSQL
Expo Android   -> /api/v1 + opaque bearer   -> FastAPI -> private file storage
```

SQLite is an explicit local-only alternative when PostgreSQL is unavailable.
There is no Supabase dependency, duplicate mobile ledger or external payment
provider required to start. The backend owns amounts, allocation and permissions.

`routes_auth`, `routes_core`, `routes_finance` and `routes_operations` are HTTP
boundaries. `ledger` owns financial operations; `imports` parses observations.
`auth` owns scoped authorization. Models are SQLAlchemy 2 mapped classes.
The shared API package contains checked-in OpenAPI and generated schema types.
`npm run api:generate` refreshes them without requiring a running server.

The website uses Tailwind infrastructure with custom semantic CSS and lucide
icons. Forms use React Hook Form, native constraints, Zod and backend validation.
The native application uses Expo Router, SecureStore and TanStack Query.

No Redis, Kubernetes, paid service or remote imagery is required. Email is an
explicitly processed database outbox. Push and payment adapters are unconfigured.
Scheduling is an operator-run billing command; no daemon is silently installed.

See ADR 0001, FINANCIAL_MODEL and SECURITY for tradeoffs. Container definitions
are supplied but cannot be marked tested without Docker.
