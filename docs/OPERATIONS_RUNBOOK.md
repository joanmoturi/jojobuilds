# Operations runbook

For application instructions, use the [owner/staff guide](USER_GUIDE.md) or
[tenant guide](TENANT_GUIDE.md). This runbook covers operating the system,
not a claim that it is already publicly deployed.

## Routine checks

- Daily: check readiness, errors, unread operational notifications and backups.
- Each rent period: select the month and generate charges; review partial-period
  tenancies rather than inventing proration.
- Every approximately three days: import a fresh statement, review rejected rows,
  resolve ambiguous/duplicate credits, confirm allocations and export arrears.
  The UI freshness reminder does not retrieve bank statements.
- Recurring billing command: in the configured API environment run
  `python -m app.cli bill`. It is idempotent. Schedule it with Windows Task
  Scheduler only after validating the environment and run account.
- Email: `python -m app.cli send-mail`; inspect actual Mailpit/provider delivery.
  Queued does not mean sent. No schedule is installed automatically.
- Incorrect payment: reverse it with a reason, then record the corrected receipt.
  Preserve transaction history.
- Lost device: reset that user's password using the secure CLI or recovery flow;
  this revokes all sessions. Device-specific session UI is deferred.
- Onboarding: register property/unit/tenant/tenancy, then invite with exact tenant
  email or property-scoped staff role. Offboarding: deactivate membership/end
  tenancy; preserve financial history.
- Outage: inspect health/readiness and database availability, confirm configuration
  and migrations, restore only into a new target. Do not delete data to fix startup.
- Storage growth: apply an approved retention policy; automated garbage collection
  is not implemented. Rolled-back uploads can leave unreferenced private files.

## Unit, rental and finance checks

When onboarding a mixed-use property, check each unit's label, specification and
Residential/Commercial use. Reuse one tenant record for the same person across
several agreements and assign a distinct payment reference to each agreement.
Review both default unit price and agreed rent; changing the former must not
change existing agreements.

At the start of each period, review recurring water/garbage/service rules and
manual variable bills, then generate eligible charges. Check for missing
first-period bills on mid-month starts. A recurring rule is not a second debt
in addition to the invoice it generates.

For provider payments, reconcile bill balance, actual payment evidence and
non-reversed payment history. Maintenance cost alone neither creates a payable
nor reduces its balance. Check the selected payment month when reviewing owner
cash movement; unpaid/overdue obligation totals cover all dates.

Confirm role isolation after invitation or deployment changes: tenants see own
agreements; staff see assigned properties; private owner tax/loan/personal-use
entries remain owner-only. Managers have balance/reminder and coordination
tools, not finance access. Provider directory records gain login access only
after owner invitation and acceptance; verify assigned-job isolation across
landlords and immediate revocation after relationship changes.

## Conversations and provider document checks

Shared conversations are delivered in-app only; the SMTP worker handles provider
invitations and the separate legacy tenant notices, not shared inbox messages.
Confirm the owner-oversight disclosure is visible and that only participants can
reply to a thread. An owner observing another pair's thread must start a separate
conversation to send a message. Review access after staff assignment changes,
tenant unlinking and provider revocation/reassignment.

Before paying a provider, check the quotation's owner approval, invoice reference
and linked payable. Quote approval creates one bill; invoice approval reuses it.
Do not manually enter a duplicate bill for the same quotation. Use actual payment
evidence before recording an outgoing payment. Pending/paid service views exclude
reversed payments, and voided bills remain separate. Managers coordinate messages
and jobs without seeing these financial documents.

Job actions, messages and service-document writes commit before success responses,
so an immediate refresh can observe the saved state. After a timeout, retry the
same unchanged action rather than creating a new payment/document/message.

## Update an existing local Windows installation

1. Identify the database and data directory currently used by the API. Stop the
   website/API using their own terminals or confirmed owned process IDs so no
   one writes during the update.
2. Make a protected backup following [Backup and restore](BACKUP_AND_RESTORE.md).
   Use a new filename outside the data directory. Preserve the existing
   database, uploads and configuration; never reseed as an upgrade step.
3. Obtain the approved source update. Inspect any local edits before pulling;
   do not discard them with a destructive reset. Install dependencies only
   when the relevant dependency/lock files changed or required tools are missing.
4. Apply migrations to the intended local database. For the documented SQLite
   setup, use:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject\apps\api
$env:DATABASE_URL = 'sqlite:///./data/jojobuilds.db'
$env:DATA_DIR = './data'
$env:APP_ENV = 'development'
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic check
```

Adapt the checkout path. Use this SQLite configuration only for the local
installation; production configuration and release gates are in
[Deployment](DEPLOYMENT.md).

5. Restart the API and website following [Run on PC](RUN_ON_PC.md). Readiness
   checks database access, not every feature or migration; also open Properties,
   units, tenant bills and provider/owner pages with the appropriate roles.
6. For the unit-usage migration, review any pre-existing commercial spaces:
   older units default to Residential and require an explicit specification
   review. No migration changes their existing agreed rents or posted charges.
7. Inspect known existing accounts, a tenant balance, a receipt and a protected
   document if present. Verify tenant/staff scope before allowing ordinary use.
8. For the operations-access migration, restart both clients/API so stale
   finance controls are discarded. Existing manager accounts automatically use
   the restricted permissions; no accounts, prices or financial records are reset.
   Confirm managers cannot retrieve ledgers or financial attachments directly.
9. Process the mail outbox for provider invitations/messages and distinguish
   queued messages from delivered mail. Google is optional; configure both
   server credentials and register the exact callback before activation.
10. Apply the shared-inbox/service-document migration `c57d7cbbeaa6` after
    operations access `519c90632bf0` using `upgrade head`. It adds conversations,
    conversation messages and service documents; it does not reset existing
    accounts or financial records. Verify an owner, scoped manager, tenant and
    provider session against the recipient/oversight matrix and document-review
    permissions. Do not downgrade a populated installation: downgrade removes the
    new conversation/document tables. Use the protected restore procedure instead.

Optional `demo-tenant`, `demo-staff` and `demo-rentals` commands are for
synthetic portfolios, not production onboarding. They are not a required upgrade
step and do not replace invitations for real users.

## Recovery and release boundaries

If migration or startup fails, preserve logs without exposing credentials and
stop further writes. Investigate the configuration/schema error; use the
documented restore into a new target if necessary. Do not erase the database,
manually rewrite money rows or blindly downgrade a live ledger.

Functional tests do not close the outstanding dependency, PostgreSQL, physical
Android, email or deployment checks. Review [Testing](TESTING.md),
[Security](SECURITY.md) and the [post-build checklist](POST_BUILD_CHECKLIST.md)
before a public release.

Logs must never contain credentials, uploaded statements or tenant identity data.
Public incidents require a documented escalation and privacy response process.
