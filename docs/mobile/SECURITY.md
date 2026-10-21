# Device security

Opaque bearer sessions are stored in Expo SecureStore, not AsyncStorage or browser
localStorage. Passwords are never persisted. Secure-storage failure aborts login
and attempts to revoke the new session. Backend sessions expire, and password reset
revokes all sessions. Logout removes the device token; failed remote revocation
is explicitly reported rather than disguised as success.

Financial/tenant query data is in-memory only. No persisted read cache or offline
financial writes are implemented. Workspace change clears query caches.
Backend ownership and permissions apply even to forged/deep-linked native routes.

Use HTTPS for any real data. Local HTTP/cleartext is explicit synthetic-only
development. Do not embed payment-provider keys or privileged backend credentials.
Notification push delivery is not implemented, so no sensitive push content is sent.

Device-specific revocation UI, biometrics, app attestation, screenshot protection,
rooted-device policy and production telemetry require further assessment.
Verify behavior on a lost/locked device and platform secure-storage lifecycle.
