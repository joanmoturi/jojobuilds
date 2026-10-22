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

Owners/managers can create or edit unit specifications in their property scope.
Editing a default unit price does not change agreed tenancy rents or existing
bills, and units cannot be moved between properties. Non-financial staff unit
cards do not display rents or bill controls; assigned tenant names come from the
scoped non-financial tenant/unit selector.

| Role        | Property scope              | Tenant records   | Money/imports               | Maintenance        | Invite/deactivate          |
| ----------- | --------------------------- | ---------------- | --------------------------- | ------------------ | -------------------------- |
| Owner       | All organization properties | Manage           | Approve/export/reverse      | Manage             | Yes, except owner transfer |
| Manager     | Assigned properties         | Manage           | Approve/export/reverse      | Manage             | No                         |
| Agent       | Assigned properties         | Manage tenancies | No                          | Submit/read scoped | No                         |
| Finance     | Assigned properties         | Read             | Approve/export/reverse      | Submit/read scoped | No                         |
| Caretaker   | Assigned properties         | No directory     | No                          | Manage             | No                         |
| Maintenance | Assigned properties         | No directory     | No                          | Manage             | No                         |
| Tenant      | Own tenancy                 | Self only        | Own payments/charges/export | Own requests       | No                         |

Only the owner creates properties. Managers can edit assigned properties and
units. Tenant registration is currently most practical through the owner: agents
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

Private documents require download authorization. Caretakers/maintenance staff
can only access maintenance attachments. Tenant uploads must reference their
own tenancy; financial statement artifacts are finance-only.

Browser writes require session-bound CSRF and trusted Origin. Native sessions are
separate opaque bearer credentials. Frontend role-sensitive controls are usability,
not the security boundary. See tests for actual isolation verification.

## Service providers and private owner finances

Service-provider contacts form an organization directory for owner, manager,
finance, caretaker and maintenance roles; tenants and agents are denied.
Only owner/manager may edit the directory. Provider login is not implemented.
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
