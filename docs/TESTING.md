# Testing

From the repository root:

```powershell
npm run api:generate
npm run typecheck
npm run lint
npm test
npm run build:web
npx playwright install chromium
npm run test:e2e
npm run format:check
Set-Location apps\api
.\.venv\Scripts\python.exe -m ruff check app tests migrations
.\.venv\Scripts\python.exe -m pytest -q
```

Backend tests use a fresh disposable real SQLite database per test, not mocked
repositories. They exercise partial/overpayments, reversals, duplicate/repeated
imports, XLSX, authorization, protected attachments, recovery, simultaneous retry,
deposit isolation, maintenance and backup/restore. SQLite concurrency is not a
substitute for PostgreSQL isolation verification.

Playwright starts an isolated migrated/seeded API on 8011 and Next.js on 3011.
Stop the normal local Next.js development server first: concurrent dev servers
for the same website directory share its development lock. Restart localhost
after the browser checks. Do not point tests at your local user database.
Its committed password is synthetic and only used by that disposable test system.
It does not bootstrap or reset your local application database. Tests exercise
actual browser -> API -> database calls and mobile-width layouts.

Vitest covers exact money input. Jest/React Native Testing Library cover disabled
submission, explicit retries, readable reversed states and session restoration
remaining stable across organization switches. These are component tests, not
Android device integration tests.

Android bundle check:
`npm run export:android --workspace=@jojobuilds/mobile`.
This compiles JS/assets, not a native APK. Device/SDK, iOS, PostgreSQL and container
checks must be completed separately.

Do not replace a failed integration with a mock and call it passing.

## Verified local baseline

| Check                               | Actual result                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| OpenAPI generation                  | Passed; shared contract regenerated from backend                                         |
| TypeScript                          | Web and Android passed strict typechecks                                                 |
| ESLint                              | Web and Android passed without warnings                                                  |
| Ruff                                | Application, tests and migrations passed lint and formatting                             |
| Pytest                              | 31 passed against disposable SQLite databases                                            |
| Vitest                              | 9 passed                                                                                 |
| Jest / React Native Testing Library | 7 passed                                                                                 |
| Next.js production build            | Passed with Next.js 16.4.1 and standalone output                                         |
| Playwright Chromium                 | 6 passed against migrated FastAPI + SQLite, no mocked financial API                      |
| Android Metro/Hermes export         | Passed after route move to `src/app` and branded asset generation                        |
| Alembic model drift                 | `alembic check`: no new upgrade operations                                               |
| Migrated financial checks           | Named positive-amount/rent/deposit/due-day checks inspected on all five financial tables |
| Dependency audit                    | NOT clear: 54 non-development graph findings, including 40 high; see SECURITY            |

The browser journey creates a property, unit, tenant and tenancy; bills rent;
records a partial payment; imports/maps/previews a CSV; explicitly reconciles the
remaining amount; progresses maintenance to resolution; reloads persistent data;
and signs out, including another reload. Mobile-width checks wait for real data
to load, assert no document-level overflow and verify that payment-table actions
remain reachable through the table's own horizontal scroller.

Desktop and mobile-width synthetic screenshots are written to the ignored
`test-results` directory. These were visually inspected; they do not prove native
Android rendering.

Expansion checks cover fixed recurring bills after rent was already generated,
historical-charge preservation, partial outgoing payments, overpayment/date
rejection, exact retries, provider owed/last-paid totals, reversal/void history,
owner cash movement excluding deposits, scoped privacy and maintenance contact
access. A populated old-schema migration test preserves existing maintenance
attachments across upgrade/downgrade/upgrade. Demo-account provisioning refuses
real portfolios. Native component checks exercise restricted routes and exact
outgoing payment retry payloads. Real Chromium journeys exercise provider bills,
private spending, recurring charges and a genuine tenant session including
server-side access denial for owner/provider endpoints.
Invitation checks switch between tenant and staff roles and inspect actual
submitted payloads to ensure hidden selections are discarded. Backend tests
redeem real invitations and verify role-specific tenant links/assignments.
Synthetic staff setup covers all five staff roles, real-portfolio refusal and
selected-property isolation; Chromium signs in with an actual manager account.

Rental checks cover several units for the same tenant/property, a commercial
agreement, ended-agreement history followed by another occupant, agreed versus
default rent, per-agreement balances excluding deposits, cross-organization
isolation, scoped unit editing and unchanged historical charges. Mixed-use demo
provisioning is repeatable without duplicating bills or resetting logins and
rolls back conflicting example records. The populated migration check also
preserves existing units, tenancy rents and charges.

Chromium exercises commercial unit specifications and edits, assigning a tenant
from a unit, preselected variable/recurring bills, and a tenant's apartment,
stall and bar cards. It checks unit-specific bill filtering and landlord/tenant
layouts at phone width.

Known warnings: Starlette's test client warns about the upstream httpx transition.
An intermediate SQLite type migration warns about unnamed reflected checks; the
following migration restores named financial checks, whose presence was verified.
Do not remove the restoring migration.

Not verified: PostgreSQL or Docker runtime, physical/emulated Android, APK/AAB
signing, iOS, live email delivery, real bank formats, live providers or deployment.
