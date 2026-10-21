# JOJOBUILDS contributor conventions

- One FastAPI financial system of record; Next.js and Expo consume `/api/v1`.
- Check organization membership, assigned property and tenant ownership server-side.
- Money is integer minor units with an ISO currency; financial corrections are reversals.
- Source provenance is not payment approval. Imports never automatically allocate money.
- Public environment variables are public. Never include credentials in UI bundles.
- No real tenant data, credentials, generated local mail, databases or uploaded files in Git.
- Generate API types after backend schema changes using `npm run api:generate`.
- Keep synthetic fixtures clearly labeled. Do not claim unavailable integrations work.
- Follow `docs/LOCAL_DEVELOPMENT.md`; run focused tests before broader checks.
- Do not publish, deploy or create paid resources without explicit authorization.
