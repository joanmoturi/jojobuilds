# Authorization

An organization is the ownership boundary. Every request resolves active
membership; supplying an organization ID never grants membership. Except for the
owner, staff must be explicitly assigned to a property. Tenant visibility follows
their own tenant identity and tenancy history.

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

Private documents require download authorization. Caretakers/maintenance staff
can only access maintenance attachments. Tenant uploads must reference their
own tenancy; financial statement artifacts are finance-only.

Browser writes require session-bound CSRF and trusted Origin. Native sessions are
separate opaque bearer credentials. Frontend role-sensitive controls are usability,
not the security boundary. See tests for actual isolation verification.
