# Android architecture

Expo SDK 55, React Native 0.83, Expo Router, strict TypeScript, SecureStore and
TanStack Query. The checked-in npm lock pins the resolved compatible packages.
`src/auth` owns native sessions; `src/ui` owns reusable visual/data primitives;
`src/app/(tabs)` owns operational screens and `src/app/record` owns focused mutations.

There is exactly one FastAPI database of record. Mobile never computes rent
balances or approves a payment locally. It uses the generated shared contract.
Requests time out and writes are not automatically retried. Payment retry keys
remain stable for the mounted entry form.

Five main tabs: overview, properties, tenants, payments and More. More contains
maintenance, notifications and workspace/account settings. Restricted roles do
not receive financial tabs; the server still authorizes every request.

Only a revocable opaque token persists in secure device storage. Query results
remain in memory, clear on logout/workspace change and are not an offline database.
Network failures are explicit; no offline financial mutation queue exists.

Complex statement mapping, ambiguous/duplicate matches, setup, deposit entry,
receipt printing and reversals are website workflows. Native review can explicitly
confirm one exact-reference candidate. No push delivery, biometrics, camera upload,
native CSV import or tenant-native experience is claimed implemented.
