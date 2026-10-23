# Authorization

An organization is the ownership boundary. Every request resolves active
membership; supplying an organization ID never grants membership. Except for the
owner, staff must be explicitly assigned to a property. Tenant visibility follows
their own tenant identity and tenancy history.

One tenant identity can have multiple residential/commercial agreements, including
several units at one property. The tenant-only `/rentals` view returns one record
per own agreement, with agreed rent and that agreement's unpaid non-deposit bills.
Ended agreements remain visible; a later occupant's charges never appear with
the previous occupant's history. Tenant `/properties` counts only the tenant's
own linked units, not the building's inventory.

Only owners can create or edit property and unit specifications.
Editing a default unit price does not change agreed tenancy rents or existing
bills, and units cannot be moved between properties. Non-financial staff unit
cards do not display rents or bill controls; assigned tenant names come from the
scoped non-financial tenant/unit selector.

| Role        | Property scope              | Tenant records              | Money/imports                   | Maintenance          | Invite/deactivate          |
| ----------- | --------------------------- | --------------------------- | ------------------------------- | -------------------- | -------------------------- |
| Owner       | All organization properties | Manage                      | Approve/export/reverse          | Manage               | Yes, except owner transfer |
| Manager     | Assigned properties         | Contacts/read-only balances | No ledgers, receipts or exports | Coordinate, no costs | No                         |
| Agent       | Assigned properties         | Manage tenancies            | No                              | Submit/read scoped   | No                         |
| Finance     | Assigned properties         | Read                        | Approve/export/reverse          | Submit/read scoped   | No                         |
| Caretaker   | Assigned properties         | No directory                | No                              | Manage               | No                         |
| Maintenance | Assigned properties         | No directory                | No                              | Manage               | No                         |
| Tenant      | Own tenancy                 | Self only                   | Own payments/charges/export     | Own requests         | No                         |

Only the owner creates/edits properties, units and provider-directory contacts.
Managers are operations employees: they may read assigned-tenant outstanding and
overdue balances, send tenant messages, and route/update maintenance. They cannot
access default/agreed rent, deposits, payments, supplier totals, financial exports
or agreement mutations. Tenant registration is currently most practical through the owner: agents
do not see unassigned tenant records until a tenancy connects them to a property.
No platform super-admin browsing role exists.

Staff invitations support property assignments; the website initially selects
one property, while the API accepts multiple. Subsequent permission/assignment
editing is deferred. Deactivation is effective on the next authorized request.
The invitation form shows either the existing-tenant selector or staff property
assignment, never both. Role changes clear both selections; the API rejects
fields that do not apply to the selected role. Invitation acceptance links a
tenant identity only for the tenant role, and staff access never inherits a
hidden tenant selection.

Private documents require download authorization. Managers/caretakers/maintenance staff
can only access maintenance attachments. Tenant uploads must reference their
own tenancy; financial statement artifacts are finance-only.

Browser writes require session-bound CSRF and trusted Origin. Native sessions are
separate opaque bearer credentials. Frontend role-sensitive controls are usability,
not the security boundary. See tests for actual isolation verification.

## Service providers and private owner finances

Service-provider contacts form an organization directory for owner, manager,
finance, caretaker and maintenance roles; tenants and agents are denied.
Only the owner may edit the directory and invite/revoke provider access.
Contact notes are staff-visible; do not put private owner-finance details there.

Supplier/operating bills, outgoing payment history and provider aggregates
require finance permission and assigned-property scope. Maintenance-only staff
receive null money/last-paid fields and cannot fetch payables.
Tax, loan and owner-use obligations, their payments/reversals and owner cash
movement are **owner-only**, even if linked to an assigned property. The
owner-only audit route preserves their financial history without exposing it
to managers. Private entries are never part of tenant rent arrears.

Recurring tenant rules are writable by authorized finance roles on scoped
tenancies; tenants may read only their own rules. Maintenance tenant/unit
pickers use a dedicated non-financial endpoint; they do not grant access to
tenant directories or tenancy rent/deposit records.

## Provider portal and messaging

Provider access is separate from organization membership. One email/password
account can link to provider records under several landlords without changing
any existing owner, staff or tenant memberships. `/provider-portal` ignores
organization-selection headers and derives its scope from active provider links
and active directory records. It exposes only assigned jobs and necessary
property/tenant contacts, plus the provider's own service bills/payments. It never
exposes rent collections, private owner obligations, other suppliers' money or
private attachments.
Providers may accept/decline and, after acceptance, add progress notes or mark
work resolved. They cannot reassign or close jobs. Providers may submit itemized
quotations for accepted open jobs, and invoices against approved quotations.
Only owners approve/reject quotations/invoices; managers receive no document
amounts or financial permissions. Quote approval creates one service payable;
invoice approval reuses it. Actual outgoing payments remain owner/finance actions.
Acceptance/decline response notes are hidden from tenants; progress notes are
tenant-visible. Revocation blocks the relationship on the next authorized request
and invalidates pending invitations. Reassignment resets the provider response.

The shared **Messages** inbox uses server-generated, property-scoped contacts:

| Sender      | Permitted recipients                                                            |
| ----------- | ------------------------------------------------------------------------------- |
| Owner       | All active relevant users for their properties                                  |
| Manager     | Owner, linked tenants and assigned service providers within assigned properties |
| Tenant      | Owner and assigned managers for their own rental agreements                     |
| Provider    | Owner and assigned managers for currently assigned jobs                         |
| Other staff | Owner for their assigned properties                                             |

Participants read/reply only while the relevant memberships, assignments,
tenant links and provider relationships remain valid. Providers do not message
tenants. Only an owner can read **all** organization-property conversations,
including conversations they did not join. Observed threads are read-only:
the owner starts a separate conversation to send their own message.
Reassigned/revoked job conversations are no longer available to former participants;
the owner retains oversight. Messages and notifications are idempotent per sender
and retry key. Changed retries conflict. Shared conversations are in-app only.

The separate legacy tenant-notice feature remains available: only owners/managers
may send these notices, within visible agreements.
Messages are persisted, linked tenants receive in-app notifications, and email
is queued only when SMTP is configured. A message without an available channel
is rejected. Exact retries do not duplicate notifications/email; changed retries
conflict. Tenants read only messages for their own linked agreements.

Google sign-in is optional and web-only. New Google identities need a matching
invitation. Existing password accounts must explicitly connect Google while
authenticated; matching email alone never links an existing account. The flow
uses browser-bound, expiring, single-use state, nonce and PKCE, and verifies the
Google identity token. No Google access/refresh tokens are stored. Credentials
and live Google-provider verification are separate deployment requirements.
