# Phone-first PWA and zero-cost demonstration

Updated November 15, 2026. No hosting resources or external accounts were created,
no paid services were enabled, and no public application URL is claimed.

## Start after restarting the PC

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject
npm run local
```

Open **http://localhost:3100** on this PC. The launcher checks both ports, applies
existing migrations, builds the production website and starts the API on
127.0.0.1:8001. It refuses occupied ports instead of silently opening Engineering
Academy or another project. It uses the existing local SQLite database and never
seeds, resets or deletes records. Keep the terminal open; Ctrl+C stops its servers.
This is a local preview using production web assets, not production-ready hosting.

For UI development without offline caching: `npm run local -- --dev`.
Dependencies must already be installed; see LOCAL_DEVELOPMENT.md for a fresh PC.
Local account creation and password reset remain explicit operator CLI tasks.

## Install and save a read-only summary

1. Use the browser's Install app menu. On supported iPhones use Safari's Share,
   then Add to Home Screen. Availability varies by browser.
2. Expand **Install app / offline access** in the footer and explicitly enable
   offline app access. Only the public offline screen and application assets are cached.
3. Sign in, open **More > Settings & access**, select the reporting month, read
   the shared-device warning, tick the unchecked box and choose **Save summary**.
4. Open **Offline and installation** to view selected totals, clear them or
   download/restore an encrypted summary file.

The saved summary contains only totals, currency, reporting month, save time and
the synthetic-data marker. It does not contain names, email, phone numbers,
messages, individual payments, uploads, session cookies or CSRF tokens. One
summary is kept per browser profile, replaced on the next save, and expires on
access after 24 hours. Save only on a locked personal device. Browser storage is
not encrypted by the app and is not an authorization boundary. Do not treat this
as a shared-device feature. Access revocation on the server cannot erase a copy
already saved offline; it remains a local copy until expiry on access or clearing.

Offline writes, rent entry, payment capture and background financial syncing are
intentionally not implemented. Changes require the online API and its existing
authorization/idempotency checks. The app never reports an offline change as saved.
The service worker does not cache API responses or token-bearing URLs. Disabling
offline access removes its cache and the saved summary; close other app tabs to
release the worker. Sign-out clears saved totals; downloaded files remain yours
to delete. Enabling or installing the PWA does not keep a PC API running.

A downloaded summary is AES-GCM encrypted with a key derived from your 12-200
character passphrase using PBKDF2-SHA-256 (210,000 iterations), with fresh random
salt and nonce. The passphrase is not stored. Restore rejects expired or modified
summaries and cannot recover a lost passphrase. **This is not a full ledger backup.**
Use [Backup and restore](BACKUP_AND_RESTORE.md) for the database and uploaded files.
The existing full-backup ZIP is not encrypted: use protected encrypted storage
and an off-device copy, and test restoration before accepting real data.

`localhost` on your phone refers to the phone, not this PC. The launcher binds to
loopback and does not expose your records to Wi-Fi or the internet. Real phone PWA
installation/offline operation needs an HTTPS origin reachable by that phone.
Do not disable TLS, origin checks or secure cookies to bypass this requirement.
Browser automation with a phone-sized viewport is not a physical-device test.

## Authentication is a separate optional feature

The web login and Google button live under `apps\web\src\components\auth`.
FastAPI's existing authentication endpoints remain the authority. No public
self-registration, Firebase migration or second user database has been added.

Password login works independently of Google. Existing Google OpenID Connect
support uses basic `openid email profile` scopes, browser-bound state, nonce and
PKCE. It remains disabled until you configure server-only `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` in `apps\api\.env` or the host's secret settings. Never put
the secret in `NEXT_PUBLIC_*`, the manifest, a browser bundle or Git.

In your Google project create a Web application OAuth client and configure the
exact redirect URI for this local preview:

```text
http://localhost:3100/api/v1/auth/google/callback
```

For hosting, use the actual HTTPS website origin with the same callback path and
configure that origin as `WEB_ORIGIN` on the API. Review the Google consent-screen
audience, privacy/terms URLs and verification requirements before external use.
Do not enable billing or unrelated APIs as a workaround. Existing password
accounts must sign in and choose **Connect Google account** with their matching
email first. A new Google user needs a valid matching invitation. Live Google
sign-in cannot be verified without your authorized credentials and configuration.

## Recommended free synthetic-demo infrastructure

Keep the existing Next.js + FastAPI + PostgreSQL design rather than rebuilding
the backend or adding another auth vendor. Use provider subdomains first; a
custom domain can cost money. A free-tier demo is not a guarantee of perpetual
availability, adequate recovery or a compliant commercial service.

| Layer       | Lean choice                              | Verified limits / trade-offs                                                                                                                                                                                                                                      |
| ----------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Website     | Netlify Free                             | Current pricing lists 300 monthly credits shared across usage. Production deploys consume credits too. Its Free-plan announcement permits commercial projects, but contains older quota figures: use current pricing and your dashboard for actual allowances.    |
| API         | Render Free                              | Sleeps after 15 minutes idle; waking can take about a minute. 750 shared free instance-hours/month. Ephemeral files are lost on restart/redeploy/sleep. Render explicitly says not to use free instances for production.                                          |
| Database    | Neon Free                                | Current plan documentation lists 1 GB/project, 100 CU-hours/project, 5 GB public transfer and five-minute scale-to-zero. Restore history is six hours, capped at 1 GB of changes, with one manual snapshot. This is not an independent backup programme.          |
| Attachments | Leave demo uploads disposable for now    | Never describe Render's filesystem as durable. Neon lists 5 GB/project of object storage on Free, but this app has no reviewed object-storage adapter yet. Private authenticated upload/download and backup integration are still required before real documents. |
| Email       | Keep demo delivery queued                | Render Free blocks outbound SMTP ports 25/465/587. An HTTPS email provider would require a separately implemented adapter and verified sending identity/domain; no real delivery is claimed.                                                                      |
| Sign-in     | Existing password auth + optional Google | No extra auth provider or paid identity service is required by this implementation. Operator Google configuration is still needed.                                                                                                                                |

**Cost controls:** select Free explicitly; do not attach a payment method, enable
auto-recharge, select a paid disk or upgrade plan. Render documents supplementary
usage billing when a payment method exists; without one it suspends services or
new builds at the relevant limits. If a signup asks for paid commitment or card
verification, stop and re-evaluate rather than assuming it is safe. Confirm current
plan terms, commercial eligibility, region and limits at signup for every provider.
No uptime pings or other tricks to evade free-tier sleep restrictions are needed.

Do not use Render Free Postgres for lasting data: it expires after 30 days and has
no backups. Vercel Hobby was excluded from the recommendation because the research
identified personal/non-commercial restrictions; recheck current terms before any
commercial use rather than treating a free plan as automatically eligible.

The existing `netlify.toml` and `render.yaml` describe the staging path; follow
[Staging and rollout](STAGING_AND_ROLLOUT.md). Provision only a synthetic-data
database, confirm the correct HTTPS origins, test authentication through the
proxy and verify persisted records survive API restarts. Free cloud compute can
sleep while you are working; offline totals are not a substitute for API access.
No cloud publication is part of `npm run local` or a GitHub source push.

## Primary sources and research limits

Checked November 15, 2026. Provider terms/quotas can change; sources disagreed
where an older launch article retained legacy allowances, so current pricing was
preferred. The recommendation reuses the already configured stack to minimize
maintenance, not because it offers a production SLA.

- Netlify pricing: https://www.netlify.com/pricing/
- Netlify Free commercial-use statement (legacy quota examples): https://www.netlify.com/blog/introducing-netlify-free-plan/
- Next.js integration: https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- Render limits/billing/sleep/storage/SMTP: https://render.com/docs/free
- Neon plans (page updated November 12, 2026): https://neon.com/docs/introduction/plans
- Vercel Hobby eligibility: https://vercel.com/docs/plans/hobby
- Google identity/credentials/redirects: https://developers.google.com/identity/openid-connect/openid-connect
- PWA installability: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable

## Still pending

- [ ] Verified public support/privacy email and public business address (left blank).
- [ ] Verify legal operator name/registration; supplied display name is not proof of registration.
- [ ] Complete [public-launch safeguards](PUBLIC_LAUNCH_SAFEGUARDS.md), including Kenyan legal review.
- [ ] Configure and verify optional Google sign-in with operator-owned credentials.
- [ ] Authorize free provider accounts and deploy synthetic staging; no public URL yet.
- [ ] Test installation on a real Android phone and iPhone over HTTPS.
- [ ] Review free-tier terms, privacy regions/transfers, isolation and tested PostgreSQL backups before real tenant data.
- [ ] Implement durable private uploads and working email before promising those features.
- [ ] Resolve existing dependency/security release gates before a real-data pilot.
