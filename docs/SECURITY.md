# Security model and limitations

## Assets and boundaries

High-sensitivity assets: tenant contact data, leases/documents, financial records,
bank statement artifacts, session/reset tokens and backups. Browser/device,
application API, database, private filesystem and future providers are separate
trust boundaries. Threats include cross-organization ID access, staff overreach,
forged payments, repeated callbacks/submissions, malicious uploads and stolen devices.

Implemented: Argon2 password hashes; hashed opaque expiring sessions; separate
native bearer sessions; HTTP-only browser cookies; CSRF/trusted Origin checks;
database-backed auth throttles; one-use recovery; server-side organization and
property checks; tenant isolation; private authorized downloads; amount constraints;
financial row locking; idempotency; input limits; MIME signatures; archive limits;
CSV formula escaping; output schemas and non-cacheable API responses.

No API grants unrestricted platform-admin access. Production refuses SQLite,
insecure cookies or non-HTTPS WEB_ORIGIN. Sensitive action tokens are not returned
by invitation/recovery endpoints. Notifications do not send sensitive push text.
No bank-login passwords or provider keys are collected.

## Publication blockers / residual risk

- Dependency advisories remain unresolved; see the dependency gate below.
- No independent penetration test or formal security certification.
- PostgreSQL role/isolation and multi-worker tests remain required.
- List pagination, reverse-proxy body limits, operational abuse limits and
  database rate-bucket retention must be completed before commercial scale.
- The current CSP permits inline framework scripts/styles; use nonces and stronger
  CSP before public production. Unsafe eval is development-only.
- Password-strength minimum is not MFA. MFA, session/device management UI and
  full account/email-change lifecycle are deferred.
- Attachment signature checks are not antivirus/content-disarm scanning. Do not
  collect national IDs; add malware scanning before broader document use.
- SMTP production authentication/provider delivery and retry operations need setup.
- Outbox delivery is at-least-once; failures can require manual retry.
- Audit immutability is enforced through application routes, not against a database
  administrator. Harden DB roles and retention/export before commercial use.
- SQLite is unencrypted at rest; rely on OS disk encryption and access controls.
  Backups are especially sensitive and require separate encryption.
- Native screens have not been device-tested. Review lost-device, TLS and rooted
  device implications before real data.

Do not expose development API docs, Mailpit, PostgreSQL or local HTTP to the
internet. Use least-privilege DB credentials, HTTPS, managed secrets, private
object storage, verified backups and monitoring before publication.

## Dependency release gate

The checked-in web framework was updated to Next.js 16.4.1 with its matching
ESLint configuration. The final local `npm audit --omit=dev` reported **54
findings: 40 high, 14 moderate, zero critical**. A web-workspace-only audit
reported **two high** findings in `braces`/`micromatch`.

Counts include transitive native tooling, Metro and Jest brought in by the mobile
dependency graph; they are not 54 independently demonstrated application exploits.
They are nevertheless unresolved advisories, not a clean security result.
Other flagged chains include `node-forge`, `uuid` and the router's query parser.

No incompatible Expo downgrade, independent router major upgrade or forced Jest
upgrade was used to suppress findings. Some registry suggestions would break the
SDK compatibility set, and the checked `braces` release had no published patched
version. Before public release, obtain supported fixes or a qualified assessment
of actual exposure and residual risk, then rerun audits and affected tests.
This audit does not replace application review, Python dependency auditing,
container scanning or penetration testing.
