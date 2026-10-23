# Post-build checklist

This is an initial usable implementation, not completion of the entire commercial
product brief. Status is factual; documentation alone does not complete an
operator task. Read README and SECURITY before entering real tenant data.

## A. Required to run locally

| Status                   | Item                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| Implemented and verified | Windows Node/Python dependency installation, lockfiles, strict TypeScript                  |
| Implemented and verified | Persistent SQLite migrations, synthetic seed, secure owner bootstrap                       |
| Implemented and verified | FastAPI/Next.js integration, desktop and mobile-width browser workflows                    |
| Implemented and verified | Backend financial/auth/isolation tests, component tests, web production build              |
| Implemented and verified | Property-scoped shared inbox, owner oversight and unchanged manager financial restrictions |
| Implemented and verified | Provider quotations/invoices, owner approval and own pending/paid/voided service views     |
| Implemented and verified | Android Metro/Hermes source export; this is not an APK                                     |
| Implemented and verified | SQLite backup and restore into a new directory                                             |
| Requires my action       | Choose owner email/password with `bootstrap`; no default real account exists               |
| Requires my action       | Start API and website using README commands; no persistent background server was installed |
| Blocked                  | Docker/PostgreSQL/container verification: tools were absent                                |
| Requires my action       | Install matching Expo Go/development client and verify physical Android connection         |

## B. Before real tenant data

| Status             | Item                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Requires my action | Replace synthetic data with a separately bootstrapped clean organization                                               |
| Requires my action | Validate reconciliation against a redacted real bank export and agreed allocation rules                                |
| Requires my action | Encrypt disks/backups and perform your own off-device restore drill                                                    |
| Requires my action | Review tenant notice, lawful basis, staff access and onboarding/offboarding                                            |
| Requires my action | Set document/import retention, secure storage and audit review procedures                                              |
| Deferred by design | National-ID collection, automated retention/deletion and identity-document workflows                                   |
| Blocked            | Unresolved dependency advisories; obtain supported fixes or qualified exposure assessment, then repeat affected checks |
| Requires my action | Configure email delivery and verify invitations/recovery actually reach recipients                                     |
| Requires my action | Validate local billing schedule and all final/partial-period charges                                                   |
| Requires my action | Explain owner conversation oversight, review recipients and set message/document retention procedures                  |

## C. Before public hosting

| Status                   | Item                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Requires my action       | Choose domain, hosting, HTTPS, private PostgreSQL and durable private storage            |
| Requires my action       | Review production secrets, secure cookies, CSP/nonces, edge limits and DB privileges     |
| Requires my action       | Complete PostgreSQL financial/concurrency/isolation and backup/restore tests             |
| Requires my action       | Validate Docker builds and pin reviewed container digests                                |
| Requires my action       | Configure monitoring, alerting, backup retention, incident response and rollback         |
| Requires my action       | Independently assess applicable ODPC registration/privacy obligations                    |
| Requires my action       | Review actual provider prices and approve external accounts/services                     |
| Implemented and verified | Private personal GitHub repository joanmoturi/jojobuilds explicitly approved and created |
| Requires my action       | Choose an appropriate license before any public source release                           |
| Not applicable           | No public deployment, purchase, signing or store publication performed                   |

## D. Before selling to other landlords

| Status             | Item                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------- |
| Requires my action | Independent tenant/organization/property authorization and security review                  |
| Requires my action | Terms, privacy notices, processor contracts, support and incident procedures                |
| Requires my action | Data-subject requests, retention/deletion/account-closure and export lifecycle              |
| Requires my action | Full user-facing pagination, scale/load tests and operational abuse controls                |
| Deferred by design | Subscription billing, platform administrator console, self-service organization lifecycle   |
| Deferred by design | Full accounting journal, credit notes, explicit split-allocation editor and deposit refunds |
| Deferred by design | Lease generation/renewal, inspections, announcements and full attachment management UI      |
| Requires my action | Validate recovery and compatibility for multiple real customer organizations                |

## E. Deferred integrations

| Integration              | Status             | Existing boundary / missing activation work                                                                                                                                                  |
| ------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-Pesa Daraja            | Deferred by design | Provider protocol and honest status; needs authorized sandbox/production account, documented callbacks/authentication, idempotency and reconciliation testing                                |
| Bank feeds               | Deferred by design | Statement-based workflow works; needs verified Kenyan bank/product coverage, consent, tokens, cursor/webhook lifecycle and cross-source deduplication                                        |
| WhatsApp                 | Deferred by design | Messaging protocol only; requires business onboarding, recipient consent, approved templates, current pricing and delivery callbacks                                                         |
| SMS                      | Deferred by design | No active adapter; provider, consent, costs and delivery verification required                                                                                                               |
| Email                    | Requires my action | Database outbox/SMTP worker exists; set up Mailpit locally or an authorized production relay and verify delivery                                                                             |
| Google sign-in           | Requires my action | Optional web OAuth login/linking implemented; configure server credentials, exact callback and consent access, then verify live Google sign-in on staging. Password login remains available. |
| Push                     | Deferred by design | In-app notifications exist; no token registration, credentials or push-delivery provider                                                                                                     |
| PDF/OCR statement import | Deferred by design | CSV/XLSX only; requires redacted fixtures, extraction confidence and explicit review                                                                                                         |

Recommended order: validate CSV/manual records -> physical Android verification ->
PostgreSQL and privacy/security hardening -> authorized provider sandbox ->
tested production access. Check recurring charges; do not invent prices.

## Five immediate operator actions

1. Run the README startup and choose a private owner account.
2. Explore a separate synthetic demo portfolio before loading real records.
3. Test a redacted real CSV/XLSX through preview and reconciliation.
4. Install the Android development environment and verify the same records on a phone.
5. Review security/privacy/dependency blockers before authorizing hosting or public release.
