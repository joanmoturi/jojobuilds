# Operations runbook

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

Logs must never contain credentials, uploaded statements or tenant identity data.
Public incidents require a documented escalation and privacy response process.
