# Local development (Windows)

For the step-by-step operator instructions, start with [Run on PC](RUN_ON_PC.md)
or [Run on Android](RUN_ON_ANDROID.md). This page covers developer installation,
PostgreSQL and local email configuration.

## Fresh installation

Install Node 24 and Python 3.14, then from the repository root:

```powershell
npm ci
Set-Location apps\api
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock
```

The Python lock contains the exact versions validated on this Windows machine.
`pyproject.toml` is the source manifest. If a configured enterprise mirror serves
missing `.metadata` sidecars, fix the mirror or use an authorized package index.
Do not disable TLS verification or install untrusted wheels.

## Explicit SQLite local mode

From the root, `.\scripts\Start-Api.ps1 -Initialize` creates the data directory,
applies Alembic migrations and starts the API on loopback. It selects SQLite only
when neither DATABASE_URL nor an API `.env` is present, and announces that mode.

Bootstrap in a separate terminal using the README command. `seed` instead creates
three properties, twelve units, nine tenants and synthetic payments in a separate
demo-marked organization. It prompts for a password, and refuses existing emails.
Use different owner emails for clean and demo organizations.

Start web: `npm run dev:web`. Stop processes using Ctrl+C. Database and files remain
in `apps\api\data`; never delete this folder as a troubleshooting shortcut.
There is no destructive reset script; use a new explicitly chosen test database.

## PostgreSQL

Install Docker Desktop, copy root `.env.example` to `.env` and set a strong
POSTGRES_PASSWORD. Do not reuse real bank credentials.

```powershell
docker compose up -d db
Set-Location apps\api
Copy-Item .env.example .env
```

Edit the untracked API `.env` with the matching database URL/password.
Run `.\.venv\Scripts\python.exe -m alembic upgrade head`, bootstrap and start uvicorn.
Switching databases does not migrate SQLite data automatically.

Container configuration is provided but not verified in this environment:

```powershell
docker compose --profile app build
docker compose --profile app run --rm api python -m alembic upgrade head
docker compose --profile app up -d
```

## Local email

```powershell
docker compose --profile mail up -d mailpit
```

Set SMTP_HOST=127.0.0.1 and SMTP_PORT=1025 for a host-run API.
Then run `python -m app.cli send-mail` using the virtual environment.
Local captured messages appear at `http://localhost:8025`.
Without SMTP, mail stays queued; no invitation/reset email is claimed delivered.
Never expose Mailpit publicly or use real recipient data in it.

## Common problems

- 503 readiness: configure DATABASE_URL and apply migrations.
- 401: session expired/revoked; sign in again.
- 403 on writes: use `localhost:3000`, correct WEB_ORIGIN and refresh CSRF/session.
- Missing property: verify membership, property assignment and current organization.
- 409 import/payment: inspect existing record; do not bypass deduplication.
- 422 import: CSV must be UTF-8; choose date/decimal formats and a single currency.
- Native phone unreachable: `-Lan`, trusted firewall rule and LAN IPv4, not localhost.
- Existing email: `python -m app.cli set-password --email YOUR_EMAIL` securely resets
  that account and revokes all its sessions.
