# Backup and restore

Backups contain private records, hashes, sessions, one-use tokens and documents.
Store them encrypted with tightly limited access; never put them in Git or a
public cloud bucket. The built-in ZIP is not encrypted. Quiesce writes for an
operational snapshot and maintain an offline/off-device copy.

## SQLite local mode

In `apps\api`, with DATABASE_URL configured as when running the API:

```powershell
.\.venv\Scripts\python.exe -m app.cli backup --output C:\Backups\jojobuilds-2026-10-21.zip
.\.venv\Scripts\python.exe -m app.cli restore --input C:\Backups\jojobuilds-2026-10-21.zip --output-dir C:\Backups\jojobuilds-restored
```

Create the parent backup directory first and choose your own dated filename.
Backup uses SQLite's online backup API, not a copy of a live DB without its WAL.
It includes private `imports` and `attachments`. It refuses an existing output.

Restore writes to a **new** directory and never overwrites a running database.
Archive paths are allowlisted and a SQLite integrity check is required.
Stop the API; configure DATABASE_URL to the restored `database.db` and DATA_DIR to
the restored `files` directory; run readiness and inspect tenant balances and a
sample attachment. Revoke restored sessions/reset credentials when recovering
from a security incident.

Integration tests verify record count preservation, no-overwrite and traversal
rejection. They do not establish your off-site recovery process or recovery SLA.

## PostgreSQL

Use `pg_dump --format=custom` plus a private uploaded-file snapshot. Restore using
`pg_restore` into a newly provisioned isolated database, not the live target.
Supply connection credentials through a secure environment/password file, not
command-line history. Match database and file snapshots, apply migrations and
verify authorization, financial totals and downloads before switching traffic.

PostgreSQL backup/restore has not been executed here because PostgreSQL/Docker
are unavailable. Validate it before migrating real data or publishing.
