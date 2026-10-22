# JOJOBUILDS

A local-first Kenyan property workspace, with a responsive Next.js website,
FastAPI financial backend and Expo Android landlord application.

The visual direction follows the supplied navy/ivory/terracotta Stitch references.
All portfolio amounts come from persisted records. Statement imports are not
represented as independent bank authentication.

## Start here

| Guide                                                | What it covers                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| [User guide](docs/USER_GUIDE.md)                     | Properties, tenants, monthly rent, receipts, statement review and maintenance   |
| [Run on your PC](docs/RUN_ON_PC.md)                  | Start/stop/restart, create a demo login, passwords and troubleshooting          |
| [Run on Android](docs/RUN_ON_ANDROID.md)             | Native Expo Go, phone-browser access, Wi-Fi, firewall and addresses             |
| [Deploy for real users](docs/DEPLOYMENT.md)          | Staging, HTTPS, private PostgreSQL, containers, jobs, backups and release gates |
| [Build an Android APK](docs/mobile/ANDROID_BUILD.md) | Standalone installation and production build configuration                      |

## Run on this Windows computer

Node 24 and Python 3.14 are supported by the checked-in dependency lockfiles.
The dependencies have been installed in this working copy.

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject
.\scripts\Start-Api.ps1 -Initialize
```

This starts an explicit **SQLite local-development database** without Docker.
It is not an implicit fallback, and is not supported for public/multi-worker use.

In another terminal, create your owner account; choose your own password:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject\apps\api
$env:DATABASE_URL = 'sqlite:///./data/jojobuilds.db'
.\.venv\Scripts\python.exe -m app.cli bootstrap --email YOUR_EMAIL --name "Your Name"
```

For a separate synthetic demo portfolio, use `seed` instead of `bootstrap`.
Do not use demo data as a real rent ledger. No default account/password is shipped.

In another terminal:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject
npm run dev:web
```

- Website: `http://localhost:3000`
- API health: `http://127.0.0.1:8000/health`
- Local API documentation: `http://127.0.0.1:8000/docs`
- Android: see `docs/mobile/LOCAL_DEVELOPMENT.md`.

Use `localhost:3000` consistently; browser origin and cookie/CSRF checks are explicit.
The URL alone does not start the application. Keep the API and website processes
running, and restart them after a PC reboot; they are not Windows startup services.

## What is implemented

- Organization/property-scoped staff access, tenant-isolated web portal, opaque
  sessions, invitations, recovery and a configurable local email outbox.
- Properties, buildings/units, tenants, tenancy history and move-out.
- Monthly charges, partial payments, oldest-charge allocation, tenant credit,
  payment reversal, CSV ledger export and printable payment acknowledgements.
- Fixed recurring water/garbage/service charges and manually entered variable bills.
- Service-provider contacts, maintenance assignment, supplier bills, partial
  outgoing payments, last-payment dates, reversals and unpaid-bill voids.
- Owner-private manual tax/loan obligations, personal-use spending and monthly
  recorded cash movement. These are not automatic tax calculations or bank balances.
- CSV/XLSX column mapping, preview, rejected-row reporting, import history,
  conservative duplicate review and explicit payment confirmation.
- Maintenance requests, validated status updates, costs, protected file API,
  in-app notifications and audit history.
- Android overview, property/unit browsing, tenant search, manual payment entry,
  exact-reference reconciliation review, maintenance and notifications.
- Android **More** includes provider bills, recurring/variable tenant bills and
  owner-only finances. A synthetic tenant website login can be created with
  `demo-tenant`; see the [user guide](docs/USER_GUIDE.md#try-the-tenant-website-locally).
- PostgreSQL Compose configuration; explicit SQLite mode for local use without Docker.

## Not the complete commercial product

This is an initial operational implementation, **not a claim that all 755 lines
of the web prompt and the mobile prompt are complete**. Read
`docs/POST_BUILD_CHECKLIST.md` before real tenant data or public hosting.

Bank feeds, M-Pesa Daraja, WhatsApp/SMS and push delivery are disabled. PDF statement
OCR, automatic deposit refund handling, a full accounting journal, lease-document
generation, move-in/out inspections, announcements, self-service organization
settings, a platform-admin console and the complete commercial lifecycle are not
implemented. Attachment API exists; a complete attachment management UI is deferred.
List endpoints are bounded and do not yet offer full user-facing pagination.

Dependency audits are **not clean**: unresolved transitive advisories remain,
including high-severity findings. Read `docs/SECURITY.md`; passing functional tests
does not establish production security readiness.

No Android APK has been signed or installed on a physical device here. Exporting
the Android JavaScript bundle is not an APK build. PostgreSQL/Docker verification
requires installing those tools. These are publication blockers, not completed tasks.

## Repository

| Path                  | Purpose                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| `apps\api`            | FastAPI, SQLAlchemy, Alembic, integration tests, administration        |
| `apps\web`            | Next.js management workspace and tenant web portal                     |
| `apps\mobile`         | Expo Android landlord/staff client                                     |
| `packages\api-client` | OpenAPI schema, generated types, shared request client                 |
| `scripts`             | Windows startup, contract generation and isolated browser-test backend |
| `docs`                | Architecture, security, operations and release checklists              |

## Checks

```powershell
npm ci
npm run api:generate
npm run typecheck
npm run lint
npm test
npm run build:web
npm run test:e2e
Set-Location apps\api
.\.venv\Scripts\python.exe -m pytest -q
```

Fresh-machine instructions, PostgreSQL, backups, restore and GitHub publication:
see `docs/LOCAL_DEVELOPMENT.md`, `docs/BACKUP_AND_RESTORE.md`,
`docs/TESTING.md` and `docs/GITHUB.md`.

No project-wide software license has been selected. Existing third-party notices,
including the Expo scaffold's MIT license, are retained. Choose an appropriate
project license before making a public open-source release. Nothing has been
deployed or purchased on your behalf. GitHub source publication is separate from
hosting the website/API or distributing a signed Android application.
