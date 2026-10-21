# Deploy JOJOBUILDS for real users

## Read this first: not approved for public production yet

The local website works, but deployment is not just opening port 3000.
Outstanding gates include dependency advisories, PostgreSQL/container validation,
stronger CSP/edge protection, production email and physical Android testing.
Read [Security](SECURITY.md) and [the post-build checklist](POST_BUILD_CHECKLIST.md).

The steps below are a **reference deployment runbook**, not an already provisioned
or verified hosting environment. No provider account, domain, server, signing
credential or purchase has been created. Complete staging and the release gates
before enabling real tenant data or public registration/invitations.

## 1. Understand what gets deployed

```text
PC browser / Android app
          |
     HTTPS domain
          |
    TLS reverse proxy
          |
     Next.js website
          |
     private FastAPI
       /          \
private PostgreSQL  private durable files
```

Both clients use the same API and records. GitHub hosts source code, not your
running database/API. An APK also does not host the backend.

This runbook uses a single Linux Docker host for the website/API, an HTTPS reverse
proxy, and separately provisioned managed PostgreSQL. It is a small-deployment
reference, not a high-availability architecture. It does not require a specific
cloud vendor. Review actual provider pricing, backup capabilities, data region,
access controls and support before purchasing anything.

The current file backend needs a durable private volume. It is not object storage.
Do not run several API replicas on independent filesystems. Implement/test shared
private storage before horizontal scaling.

## 2. Prepare an isolated staging environment first

Use a staging domain, separate database and synthetic accounts. Before production:

- Run the full checks in [Testing](TESTING.md) on the candidate version.
- Resolve or obtain a qualified exposure assessment for outstanding advisories;
  record the decision and rerun affected tests.
- Validate both Dockerfiles on Linux and the complete PostgreSQL migration chain.
- Test tenant/organization/property isolation and repeated/concurrent financial
  requests against PostgreSQL, not just SQLite.
- Complete stronger CSP, edge request-size/rate limits and operational abuse
  controls; the minimal proxy example below does not implement all of these.
- Verify password recovery, invitations, lost-device handling and backup restore.
- Review privacy notices, retention, processing responsibilities and applicable
  registration obligations with an appropriate professional.
- Choose the GitHub repository's owner, visibility and software license before
  publishing source. Never publish `.env`, tenant data, backups or signing files.

Use [GitHub instructions](GITHUB.md) if you choose to publish source. A deployment
should identify the exact reviewed commit/release, not an untracked working copy.

## 3. Provision the infrastructure

Have an authorized operator provision:

1. A patched Linux host with Docker Engine, Compose v2, durable disks, monitoring
   and SSH key access. Verify SSH host keys; never expose the Docker socket or an
   unauthenticated Docker TCP API publicly.
2. A domain/subdomain with DNS pointing at that host. Only HTTPS/HTTP ingress
   ports 443/80 should be public for this reference. Restrict administrative SSH
   to approved addresses/access controls.
3. A private managed PostgreSQL database compatible with the schema (the local
   Compose example targets PostgreSQL 17), accessible from the host's approved
   private network. Require TLS with certificate and hostname verification.
4. Separate database identities for migrations and normal application use.
   The runtime identity must not be a superuser/schema owner. Grant the required
   application table/sequence privileges after migration and retain the same
   grants/default privileges for future migrations.
5. Encrypted off-host database backups/PITR and private file-volume backups.
   Define recovery targets, retention and the person responsible for restores.
6. An approved SMTP relay and scheduled-job mechanism, described below.

Do not use your personal PC, router port forwarding, development tunnels, Mailpit
or SQLite as the public production service.

## 4. Production settings

Use the hosting platform's secret manager where possible. A local ignored
`.env.production` is shown only as an operator-managed example. Restrict its file
permissions, do not commit it, and do not paste expanded configuration in tickets.

Create `C:\Users\joanmoturi\Downloads\myproject\.env.production` with your actual
values, replacing **every** placeholder:

```dotenv
APP_DOMAIN=rent.your-real-domain.example
DATABASE_URL=postgresql+psycopg://RUNTIME_USER:URL_ENCODED_PASSWORD@PRIVATE_DB_HOST:5432/jojobuilds?sslmode=verify-full&sslrootcert=system
SMTP_HOST=PRIVATE_APPROVED_SMTP_RELAY
SMTP_PORT=587
SMTP_FROM=JOJOBUILDS <noreply@your-real-domain.example>
```

The `.example` domains are deliberately not real domains. Replace them.
Percent-encode reserved characters in a connection-string password. The example
uses libpq's system trust store; if your provider requires its own CA bundle,
provision that trusted bundle in the API container and set `sslrootcert` to the
container path. Verify TLS from the actual image; do not turn verification off.

| Setting                            | Purpose                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `APP_ENV=production`               | Enables API production validation; SQLite is rejected                     |
| `COOKIE_SECURE=true`               | Browser session cookies require HTTPS                                     |
| `WEB_ORIGIN=https://your-domain`   | Exact website origin, no trailing slash                                   |
| `DATABASE_URL`                     | Private PostgreSQL runtime connection, never a mobile/web public variable |
| `DATA_DIR=/app/data`               | Private durable imports/attachments location in the container             |
| `SESSION_HOURS`                    | Session lifetime; reference below uses 12                                 |
| `API_INTERNAL_URL=http://api:8000` | Private website-to-API destination; fixed when building Next.js           |
| `EXPO_PUBLIC_API_URL`              | Android public HTTPS origin plus `/api/v1`                                |
| `EXPO_PUBLIC_WEB_URL`              | Android public HTTPS website origin, without `/api/v1`                    |

Never put database/provider secrets in `NEXT_PUBLIC_` or `EXPO_PUBLIC_` variables.
Changing the Next.js API proxy destination requires rebuilding the web image.

## 5. Example production Compose definition

Do **not** deploy the root `compose.yaml` unchanged: it is a development setup.

Create `compose.production.yaml` in the repository root using this separate
reference. It uses the managed database from step 3; there is no bundled database
with a default administrator password. Internal API/web ports are not published.

```yaml
services:
  api:
    build:
      context: ./apps/api
    restart: unless-stopped
    environment:
      DATABASE_URL: ${DATABASE_URL:?Set the runtime PostgreSQL URL}
      APP_ENV: production
      COOKIE_SECURE: "true"
      WEB_ORIGIN: https://${APP_DOMAIN:?Set your real domain}
      DATA_DIR: /app/data
      SESSION_HOURS: "12"
      SMTP_HOST: ${SMTP_HOST:?Configure an approved relay}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_FROM: ${SMTP_FROM:?Set your sender}
    volumes:
      - private_files:/app/data
    healthcheck:
      test:
        - CMD
        - python
        - -c
        - "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/ready', timeout=5)"
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        API_INTERNAL_URL: http://api:8000
    restart: unless-stopped
    environment:
      HOSTNAME: 0.0.0.0
      NODE_ENV: production
    depends_on:
      api:
        condition: service_healthy
  edge:
    image: caddy:2
    restart: unless-stopped
    command:
      - caddy
      - reverse-proxy
      - --from
      - ${APP_DOMAIN:?Set your real domain}
      - --to
      - web:3000
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - tls_data:/data
      - tls_config:/config
    depends_on:
      - web
volumes:
  private_files:
  tls_data:
  tls_config:
```

This is a minimal HTTPS routing example, not complete edge hardening. Add and
test the required WAF/rate/body-size policies before launch. Retain certificate
state and private file volumes across updates. Pin reviewed image digests rather
than relying on mutable major tags for an approved production release.

The database must already be reachable with the runtime user's permissions.
The server also needs authorized outbound access for certificate issuance,
dependency/image downloads and the SMTP relay.

## 6. Build and start from Windows PowerShell

These future commands connect to your authorized remote Linux Docker host.
They do not install Docker/SSH or provision the host/network/database for you.
Do not execute them against production before staging approval.

Install a supported Docker CLI/Compose v2 on the PC. Authenticate SSH using your
approved key and verify the server fingerprint. Replace the SSH destination:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject
docker context create jojobuilds-production --docker "host=ssh://deploy@YOUR_SERVER"
docker --context jojobuilds-production info
```

The remote account needs Docker administration access; treat it as privileged.
Builds transmit the selected source context to that host. Review `.dockerignore`
and keep secrets, uploads, databases, virtual environments and backups excluded.

In the same PowerShell terminal, define this helper so every command explicitly
targets the chosen host, file and project:

```powershell
function Invoke-JojoProduction {
    docker --context jojobuilds-production compose --project-name jojobuilds --env-file .env.production -f .\compose.production.yaml @args
    if ($LASTEXITCODE -ne 0) {
        throw "Deployment command failed. Stop and resolve the error before continuing."
    }
}
```

Validate the configuration without printing its secret-expanded contents:

```powershell
Invoke-JojoProduction config --quiet
Invoke-JojoProduction build
```

Supply the separate migration connection securely into this operator process as
`JOJOBUILDS_MIGRATION_DATABASE_URL` using your approved secret-manager mechanism.
Do not type a real password into a command saved in history. Then run exactly
one migration job:

```powershell
if (-not $env:JOJOBUILDS_MIGRATION_DATABASE_URL) {
    throw "Load the authorized migration connection from your secret manager first."
}
Invoke-JojoProduction run --rm --no-deps --env "DATABASE_URL=$env:JOJOBUILDS_MIGRATION_DATABASE_URL" api python -m alembic upgrade head
```

Have the database operator apply/verify runtime permissions after migrations.
Migration credentials must not be stored in the long-running API service.

Create your production owner with **bootstrap**, not `seed`; replace the email:

```powershell
Invoke-JojoProduction run --rm --no-deps api python -m app.cli bootstrap --email "you@your-real-domain.example" --name "Portfolio Owner"
Invoke-JojoProduction up -d --wait
Invoke-JojoProduction ps
```

Choose a private password when prompted. If the account exists, sign in or use
the authorized reset procedure; do not create repeated owner accounts as a
troubleshooting shortcut.

Open `https://YOUR_REAL_DOMAIN` and verify the TLS certificate and login.
Use scoped logs to diagnose failures:

```powershell
Invoke-JojoProduction logs --tail 100 api web edge
```

Logs may contain personal information; redact them before sharing. A successful
container start is not proof of financial correctness or privacy readiness.

## 7. Email and scheduled jobs

The application queues invitation/recovery email in the database. It does not
run an automatic background mail worker or billing scheduler.

Use a restricted SMTP relay reachable from the API host. The current worker
uses STARTTLS in production but has **no SMTP username/password authentication
settings**. An arbitrary Gmail/consumer SMTP login will not work. If your provider
requires SMTP AUTH, implement/test that support before launch or provision an
authorized, tightly restricted relay that supports this worker. Never create an
open mail relay.

Manual operator jobs:

```powershell
Invoke-JojoProduction run --rm --no-deps api python -m app.cli send-mail
Invoke-JojoProduction run --rm --no-deps api python -m app.cli bill
```

Configure an approved scheduler for regular mail delivery and agreed monthly
billing. Prevent overlapping mail workers, monitor failures/queue age and prove
invitation/recovery delivery using test recipients. Billing is idempotent per
eligible tenancy/month; review partial-period charges yourself.

The statement reminder does not fetch bank statements. There is no scheduler
that downloads them every three days.

## 8. Acceptance before inviting real users

In staging first, then with controlled production smoke records:

1. Sign in/out, reload, recover a password and redeem an invitation over HTTPS.
2. Confirm two unrelated organizations and restricted staff cannot read or mutate
   one another's records; test the tenant portal separately.
3. Create a property/unit/tenant/tenancy, bill once, bill again without duplicates,
   record a partial receipt and check balances.
4. Import a synthetic statement, explicitly reconcile, retry the same file and
   verify no duplicate receipt. Verify reversal and deposit/rent separation.
5. Upload/download an authorized private file and confirm unauthorized access is
   denied. Do not collect national IDs as a test.
6. Restart containers and confirm records/files remain. Restore a database and
   file backup into an isolated target and compare balances/downloads.
7. Check monitoring, TLS renewal, backup alerts, failed mail, disk capacity and
   incident contacts.
8. Verify the Android client against this same HTTPS backend on a real device.

Do not announce availability until the applicable post-build gates are signed off.
A limited owner-operated pilot is not approval to sell this as a multi-customer
commercial service.

## 9. Android distribution after hosting

Follow [Android builds](mobile/ANDROID_BUILD.md). Set the build environment to:

```dotenv
EXPO_PUBLIC_API_URL=https://YOUR_REAL_DOMAIN/api/v1
EXPO_PUBLIC_WEB_URL=https://YOUR_REAL_DOMAIN
```

Leave `JOJOBUILDS_ALLOW_HTTP` unset. Build a preview APK, install it on a real
Android device and complete the mobile release checklist. A production AAB is
for Google Play distribution; store enrollment, policies and signing are separate
operator actions. Neither source publication nor an EAS build publishes the API.

## 10. Updates, backup and rollback

- Preserve the exact reviewed source revision and image identifiers.
- Before migrating/updating, create an encrypted PostgreSQL backup/PITR recovery
  point and a matching private-file snapshot. Read [Backup and restore](BACKUP_AND_RESTORE.md).
- Rehearse migrations against a restored clone. Stop writes for a consistency
  boundary when needed; there is no built-in maintenance-mode switch.
- Build the reviewed candidate, run one migration job, deploy compatible services,
  then repeat smoke checks. Plan downtime/compatibility explicitly.
- If application rollback is compatible with the schema, redeploy the prior
  reviewed images. Otherwise restore into a new isolated target and perform a
  controlled cutover; do not blindly run database downgrades.
- Never run `docker compose down --volumes`, prune application volumes or delete
  the database as a deployment/reset procedure.

The PC SQLite database is not automatically migrated to PostgreSQL. Start with a
clean approved production portfolio or design/test a separately reviewed data
migration and reconciliation process. Do not assume copying a `.db` file into a
PostgreSQL service imports it.

## Official references

- [Next.js self-hosting and reverse proxies](https://nextjs.org/docs/app/guides/self-hosting)
- [Docker Compose production guidance](https://docs.docker.com/compose/how-tos/production/)
- [Docker SSH contexts and daemon protection](https://docs.docker.com/engine/security/protect-access/)
- [Caddy HTTPS requirements](https://caddyserver.com/docs/automatic-https)
- [Caddy reverse-proxy command](https://caddyserver.com/docs/command-line#caddy-reverse-proxy)
- [PostgreSQL TLS verification](https://www.postgresql.org/docs/17/libpq-ssl.html)
- [PostgreSQL connection parameters](https://www.postgresql.org/docs/17/libpq-connect.html)
- [EAS environment variables](https://docs.expo.dev/eas/environment-variables/)
