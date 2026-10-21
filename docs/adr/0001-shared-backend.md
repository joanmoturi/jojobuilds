# ADR 0001: Local-first modular monolith and two clients

Accepted: use the explicitly requested Next.js website, FastAPI/SQLAlchemy backend,
PostgreSQL, and Expo Android client. This supersedes the earlier Expo/Supabase-only
proposal. A shared generated OpenAPI TypeScript contract prevents invented APIs.

Browser sessions use HTTP-only cookies through a same-origin Next.js proxy and a
session-bound CSRF header on writes. Mobile obtains a distinct revocable opaque
bearer session stored in Expo SecureStore. Only hashes of session tokens are saved.

PostgreSQL is the production and Compose database. Explicit SQLite local mode
allows development when Docker/PostgreSQL is unavailable; SQLite serializes writes
and is not a production multi-worker substitute. No implicit database fallback.

Money uses integer minor units. Charges, payments and allocations remain separate.
Confirmed payments can be reversed; history remains. Imports are observations
until an authorized user explicitly confirms a tenancy allocation.

Uploaded artifacts stay outside public/static directories. All reads and writes
check membership, property assignment and tenant ownership as applicable.
