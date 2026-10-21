# Implementation plan

The target folder was empty on inspection. Neither backend nor web application
existed. Prompt 1 establishes the backend before the mobile work in prompt 2.
All product branding is JOJOBUILDS. The supplied Stitch images guide the ivory,
navy and terracotta design, not legal claims, hardcoded statistics or integrations.

1. Establish a modular FastAPI/SQLAlchemy backend, Alembic migrations and local setup.
2. Implement opaque sessions, invitation/recovery, organization/property permissions.
3. Implement properties, units, tenants, tenancies, charges, allocations, reversals.
4. Implement CSV/XLSX preview, conservative duplicate review and reconciliation.
5. Implement maintenance, in-app notifications, exports and protected attachments.
6. Build responsive Next.js management and tenant experiences against real APIs.
7. Add an Expo Android client using the same generated contract and backend.
8. Exercise integration tests, production build and browser workflows where available.
9. Document startup, persistence, backups, restore, publishing and remaining limits.

## Environment constraints

Initial discovery found Node 24 and Python 3.14, but no Docker, Android SDK/adb or
Java on PATH. Do not install system software or claim PostgreSQL/device validation
without actually running it. PostgreSQL remains the deployment database; an
explicit SQLite development mode may support local use without Docker. This is
not equivalent to PostgreSQL concurrency verification.

## Completion policy

Record implemented and verified work separately from deferred, blocked and manual
work in POST_BUILD_CHECKLIST.md. No automatic GitHub publication or paid services.

## Delivered baseline

Stages 1-9 have an initial operational implementation with verification recorded
in TESTING.md. This means working core workflows, not every feature in the
original prompts. The website, backend, Android source/bundle and operational
documentation are persisted locally.

PostgreSQL/container/device verification and unresolved dependency advisories
block public release. External bank/Daraja/messaging integrations and the broader
commercial lifecycle remain explicitly deferred. See POST_BUILD_CHECKLIST.md for
operator actions and limitations. Personal private GitHub publication has been
explicitly approved; it is separate from deploying or signing the app. Neither
deployment nor a signed app is claimed.
