# Data model

- `users`, hashed `sessions`, one-use `action_tokens` and database `rate_buckets`.
- `organizations`, `memberships`, property-scoped `assignments`.
- `properties` -> `units` (building/floor attributes) -> successive `tenancies`.
- `tenants` exist independently; portal identity links by `user_id`.
- A unit has a residential/commercial `usage`, a free-text `unit_type`
  specification, a `number` used as its label and a default price. One tenant can
  have several active agreements across units/properties; the active-unit
  uniqueness rule applies to the unit, not the person. Agreement rent remains
  separate from the unit's editable default price.
- `charges` are unique per tenancy, month and kind.
- `payments` are unique per organization/idempotency key, with separate purpose
  and provenance; `allocations` connect payments to charges.
- `import_batches` preserve account label, file digest and storage metadata;
  `imported_transactions` preserve observed rows and reconciliation decisions.
- `maintenance` records include a status-update history.
- `service_providers` supplies contacts and optional maintenance assignment.
- `recurring_charges` configures fixed future monthly tenant bills; generated
  obligations remain ordinary `charges`.
- `payables` supplies scoped service/operating bills and owner-private
  tax/loan/owner-use obligations. `outgoing_payments` supplies separate immutable
  payment history with reversals; it never allocates to tenant rent.
- `attachments` reference authorized property/tenancy/request records.
- `notifications`, `mail_outbox` and append-only-through-API `audit_events`.

Identifiers are UUIDs. Foreign keys and positive-amount constraints enforce
basic integrity. An active-unit partial unique index prevents duplicate active
tenancies. Service checks validate organization ownership and overlapping dates.
Organization row locks serialize PostgreSQL financial writes; SQLite explicitly
acquires a write lock. PostgreSQL concurrency still requires its own verification.

Money is integer minor units. Organization currency defaults to KES; timestamps
are stored in UTC and business dates/reporting use Africa/Nairobi by default.
There is no FX conversion. Cross-currency statements must not be imported.

No identity-number fields are collected. Buildings are attributes of units rather
than independent building entities in this version. Inspections, announcements,
full accounting journals and deposit refunds require additional models.
