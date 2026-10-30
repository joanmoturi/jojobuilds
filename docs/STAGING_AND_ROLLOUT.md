# Staging setup and phased rollout

Status recorded: **October 30, 2026**.

**This is preparation for synthetic-data staging, not approval for business or
tenant records. No paid resources have been authorized.**

## What has been done

| Item                              | Actual status                                                                                                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source repository                 | Existing private `joanmoturi/jojobuilds`, branch `main`; the starting checkout matched GitHub                                                                                      |
| Netlify team                      | User supplied the `joan-moturi` team; this does not itself authorize CLI access                                                                                                    |
| Netlify CLI                       | Official CLI 27.14.2 installed in the npm execution cache, not added as an application dependency                                                                                  |
| Browser authorization             | Browser login timed out; the subsequent approval ticket still reported `pending` at the last check                                                                                 |
| Netlify application configuration | Root `netlify.toml` builds the web workspace, publishes `apps/web/.next`, selects Node 24, and enables the unpinned official Next.js adapter                                       |
| Hosted API routing                | Netlify builds require `API_INTERNAL_URL`; missing, HTTP, loopback, credential-bearing, or path/query/fragment-bearing origins fail instead of silently pointing at a developer PC |
| Local routing                     | Ordinary local builds retain `http://127.0.0.1:8000`; Docker builds can still use their private API origin                                                                         |
| Render configuration              | Root `render.yaml` describes one explicitly Free Docker API service, manual subsequent deploys, readiness checks, and required database/origin inputs                              |
| Local verification of this change | 21 web tests passed, including deployment-routing regressions; web TypeScript, ESLint, and production build passed                                                                 |
| Credential hygiene                | `.netlify/` is ignored; no hosting tokens, database credentials, accounts, databases, or uploaded records are committed                                                            |

## What is not done

| Item                                   | Remaining action                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Netlify authorization                  | Complete account authorization and verify membership in the intended team                        |
| Hosted Netlify project                 | Not yet created or linked; no JOJOBUILDS application URL has been verified                       |
| Git-connected Netlify builds           | Not configured; pushing source alone does not establish a deployed application                   |
| Render account/API service             | User still needs a free account and an explicitly Free staging service                           |
| Neon account/PostgreSQL                | User still needs a free account and a dedicated synthetic-data database                          |
| Cloud migration/container validation   | Not executed; Docker is not installed on this workstation                                        |
| Full-stack hosted journeys             | Not executed: no hosted backend/database exists yet                                              |
| Durable attachments                    | Not provided by Render Free; the staging configuration deliberately uses disposable `/tmp` files |
| Private business/family/tenant release | Blocked by the existing release gates and the environment-specific checks below                  |

A successful local build or an empty Netlify project is not a usable full-stack
deployment. Update this document with the actual project URLs, tested commit,
operator, and evidence after each external step succeeds. Never include secrets.

## Target architecture

```text
Browser -> Netlify HTTPS website
              |
              | same-origin /api/v1 proxy
              v
         Render HTTPS FastAPI -> dedicated Neon PostgreSQL
              |
              +-> disposable staging attachments only
```

The Android client is a separate distribution task and uses the same API.
Uploading source to GitHub does not distribute an APK or run the backend.

## 1. Reserve and configure the Netlify staging project

Open the existing team:
<https://app.netlify.com/teams/joan-moturi/projects>.

Connect only the private `joanmoturi/jojobuilds` repository through the authorized
GitHub integration. Do not make the repository public to troubleshoot access.
Use a staging-specific project name, such as `jojobuilds-staging`, subject to
availability. Do not change any paid plan or enable auto-recharge.

| Setting                  | Value                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| Git branch               | `main` for the initial controlled staging setup                                                    |
| Base directory           | Repository root; leave empty in the dashboard                                                      |
| Package directory        | `apps/web`                                                                                         |
| Build command            | `npm run build:web`                                                                                |
| Publish directory        | `apps/web/.next`, relative to the repository root                                                  |
| Node                     | 24, configured in `netlify.toml`                                                                   |
| API environment variable | `API_INTERNAL_URL`: actual Render HTTPS origin, without `/api/v1`, credentials, query, or fragment |

Keep the base directory at the root so npm workspaces, the root lockfile, and
`packages/api-client` remain available. Do not publish `public` or upload the
source folder as though this were a static HTML site.

The canonical URL of this **staging project** may be called "production" in
Netlify's deployment-context terminology. That does not mean JOJOBUILDS is
approved for real tenant data.

Do not trigger the first application deployment until the Render API is ready.
The routing guard intentionally rejects an unset API destination. It validates
configuration, not remote availability, TLS, authentication, or data isolation.

## 2. Create the dedicated Neon staging database

Create a free Neon account and a project explicitly for **synthetic staging**.
Choose an appropriate region for the eventual API. Do not import the local
business database or use a production database connection.

Store the connection URL only in Render's environment settings or an approved
local secret mechanism. JOJOBUILDS uses SQLAlchemy's psycopg driver:

```text
postgresql+psycopg://USER:PASSWORD@HOST/DATABASE?sslmode=verify-full&sslrootcert=system
```

Use the actual provider-issued values, percent-encode reserved password
characters, and verify certificate trust in the actual runtime image. Do not
disable TLS verification. The database identity and region, access model,
retention, and recovery capabilities still need review for real use.

On Windows, libpq may need an explicit CA bundle rather than `system`. The
existing API environment includes `certifi`; running
`.\.venv\Scripts\python.exe -m certifi` from `apps\api` prints its bundle path.
Use that trusted file's URL-encoded path as `sslrootcert` for the local
administration connection if required, while keeping `sslmode=verify-full`.
Do not copy a Windows certificate path into the Linux Render environment.

Never put this URL into Netlify's frontend, a `NEXT_PUBLIC_*` variable, the mobile
client, a screenshot, or this repository. A Free account is not proof of
adequate backup or production capacity.

## 3. Create the Free Render staging API

Create a free Render account. Connect only this private repository, then create
a Blueprint from root `render.yaml`.

Before confirming provisioning, verify that the service is **Free** and that no
paid disk, paid database, or other paid resource is included. This Blueprint
does not create PostgreSQL: use the dedicated Neon database from step 2.

Supply the two required inputs:

| Variable       | Value                                                           |
| -------------- | --------------------------------------------------------------- |
| `DATABASE_URL` | Dedicated Neon staging SQLAlchemy URL with verified TLS         |
| `WEB_ORIGIN`   | Exact canonical Netlify staging HTTPS origin, no trailing slash |

The Blueprint also sets `APP_ENV=production` and `COOKIE_SECURE=true` so the
public HTTPS staging API uses the application's strict PostgreSQL/cookie
configuration. "Production" here selects secure runtime behavior, not permission
to enter real records.

Its Docker paths are relative to `rootDir: apps/api`. Startup applies Alembic
migrations before starting Uvicorn on port 10000. Startup migrations are a
bounded single-service staging convenience, not a production multi-instance
migration strategy. Subsequent automatic deploys are disabled.

After the initial provisioning:

1. Confirm the image builds and migrations finish successfully.
2. Record the actual API HTTPS origin; a requested service name is not proof that
   the corresponding URL exists.
3. Confirm `/health` and `/ready` return HTTP 200.
4. Put that origin into Netlify's `API_INTERNAL_URL`, available at build time.
5. Trigger the controlled Netlify application build and inspect its result.

**Render Free is a disposable staging environment.** It can sleep and has
ephemeral files. `DATA_DIR=/tmp/jojobuilds-staging-data` must not hold important
attachments, imports, or business records. Do not switch to a public SQLite
service or treat a surviving database row as proof its attachment survived.

Render Free also blocks the common outbound SMTP ports. The application's
current SMTP sender is therefore not a working email-delivery solution on this
plan. Keep staging email synthetic and queued. A paid deployment with appropriate
SMTP access or an explicitly implemented and reviewed HTTPS email integration
is separate work; neither is configured here.

## 4. Provision synthetic test accounts deliberately

The application has no default owner password. Provision the dedicated staging
organization with the existing `seed` CLI against the **staging PostgreSQL
database**, never the local business database.

Render Free does not provide a dependable interactive administration shell.
An authorized operator can use the installed local API virtual environment.
First verify the exact target database and Netlify origin. For example:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject\apps\api
$secret = Read-Host "Dedicated staging SQLAlchemy database URL" -AsSecureString
try {
    $env:DATABASE_URL = [System.Net.NetworkCredential]::new('', $secret).Password
    $env:APP_ENV = 'production'
    $env:COOKIE_SECURE = 'true'
    $env:WEB_ORIGIN = Read-Host "Actual canonical Netlify HTTPS origin"
    .\.venv\Scripts\python.exe -m app.cli seed --email staging-owner@example.test --name "Synthetic Staging Owner"
} finally {
    Remove-Item Env:\DATABASE_URL, Env:\APP_ENV, Env:\COOKIE_SECURE, Env:\WEB_ORIGIN -ErrorAction SilentlyContinue
    $secret.Dispose()
}
```

Use a separate temporary terminal for this procedure. The CLI prompts for a
password; do not record it in docs or share it publicly. Do not use the example
email for real business operations. Create additional synthetic tenant/staff
accounts using the existing role/user guides and explicitly scoped invitations.

## 5. Verify the whole hosted path before sharing

Record pass/fail evidence for the actual deployed commit:

- Netlify HTTPS loads and `/api/v1` calls reach the expected Render service,
  rather than a loopback address, missing route, or placeholder.
- Owner login, cookie attributes, CSRF, logout, and session expiry work through
  the Netlify proxy. Do not weaken Origin or CSRF checks to fix a hosting error.
- A synthetic property/unit/tenancy, charge, partial payment, correction/reversal,
  and maintenance request persist after reload and an API restart.
- Separate organizations and tenant/provider/staff roles cannot read or change
  unauthorized records. Test denied requests, not only hidden UI controls.
- Synthetic invitation and recovery behavior is described honestly; no SMTP
  delivery is claimed before an actual provider and worker are configured.
- Cold starts, failed API calls, retry handling, uploads, and deliberately lost
  disposable attachments behave visibly, without false success.
- A dedicated staging database backup can be restored into a separate test
  database and verified. Do not overwrite the original to test recovery.
- The candidate passes the relevant commands in [Testing](TESTING.md). Local
  checks here do not replace Linux/container/PostgreSQL/hosted verification.

Only after these checks may the link be described as a working **synthetic
staging application**. Never share credentials or real records in a public demo.

## Rollout gates

| Phase                    | Intended timing                                             | Entry conditions                                                                                                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Synthetic online staging | First external deployment                                   | Dedicated test accounts/database, the complete hosted journey verified, no important files on ephemeral storage                                                                                                                                 |
| Private business pilot   | After real-data gates, not merely after a successful deploy | Resolve/review recorded dependency advisories; validate PostgreSQL financial/isolation behavior; provide durable private files, verified backups/restore, operating access and recovery; retain the existing business ledger for reconciliation |
| Family pilot             | Around late January 2027, if the gates pass                 | Individual accounts and separate organizations; cross-organization denial verified; at least one reconciled billing cycle, support/recovery process, controlled invitations                                                                     |
| Tenant invitations       | Later, readiness-based                                      | Privacy/retention responsibilities, reliable email/recovery, access review, monitoring, incident response, rollback and support; start with a small invited group                                                                               |

Real business data needs protection from the first record, including during
owner-only use. Render Free remains a synthetic staging choice, not an approved
real-data pilot. A paid API/durable-volume or reviewed private-object-storage
design requires a separate cost decision; no such purchase is authorized here.

Complete [Security](SECURITY.md), [Privacy](PRIVACY_AND_COMPLIANCE.md),
[Post-build checklist](POST_BUILD_CHECKLIST.md), [Backup and restore](BACKUP_AND_RESTORE.md),
and [Deployment](DEPLOYMENT.md) before changing that boundary.

## Operator checklist still to complete

- [ ] Finish Netlify authorization and confirm the intended team/project.
- [ ] Create the free Neon and Render accounts.
- [ ] Provision the dedicated staging database/API, without paid resources.
- [ ] Configure the two exact HTTPS origins and verify migrations/readiness.
- [ ] Complete the first Netlify deployment and record the actual URL and commit.
- [ ] Verify and record every hosted acceptance check above.
- [ ] Resolve real-data gates before the private business pilot.
- [ ] Review family-pilot readiness around January 2027; do not launch by date alone.
- [ ] Complete tenant-facing release approvals before inviting tenants.

## Provider references

Checked during preparation on October 30, 2026. Plans, limits, and interfaces can
change; recheck them before creating resources or approving real use.

- [Netlify monorepos](https://docs.netlify.com/build/configure-builds/monorepos/)
- [Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- [Netlify CLI authentication](https://docs.netlify.com/cli/get-started/#authentication)
- [Netlify pricing and usage limits](https://www.netlify.com/pricing/)
- [Render Blueprint specification](https://render.com/docs/blueprint-spec)
- [Render monorepo paths](https://render.com/docs/monorepo-support)
- [Render Free limitations](https://render.com/docs/free)
- [Neon plans](https://neon.com/pricing)
- [Neon connection verification and CA trust](https://neon.com/docs/connect/connect-securely)
