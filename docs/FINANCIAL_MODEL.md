# Financial model

Amounts are positive integer minor units (KES 1.00 = 100). Invoice/charge, observed
bank transaction, posted payment and charge allocation are different concepts.
No `is_paid` field is a source of truth.

Rent belongs to the individual tenancy, not the property or tenant identity as a
whole. A tenant renting several units has a separate agreement, payment reference,
charges and allocation history for each. Unit default prices are descriptive
starting values for new agreements; editing a default never changes agreed rents
or existing bills. The staff tenant-directory monthly total sums all of that
person's active agreements; unit cards retain each agreement's separate amount.

Charge balance = charge amount - allocations from non-reversed payments.
Rent outstanding/overdue exclude deposits. Overdue means a positive charge balance
with due date before the property's local date. A charge can be part-paid and overdue.
Collection rate = allocations to the selected month's non-deposit charges /
those charges' amount. Zero billing displays 0%, not division by zero.
Cash received in a month is non-reversed rent-purpose payments dated in that month;
it is not necessarily allocated to that month's charges.

Manual and statement-imported provenance is displayed explicitly. Neither is
independent bank authentication. Imports never automatically confirm payment.
Only positive credits can be confirmed. Debit/non-credit rows remain observations.

Payments allocate oldest due-date-first within the tenancy/currency/purpose.
Deposit-purpose payments only settle explicit deposit charges; rent-purpose
payments never settle deposits. The tenancy's agreed deposit is not proof of
receipt. Deposit refunds, forfeiture and transfers are deferred.

Overpayments remain unallocated credit. Future generated charges may consume
available credit. After a reversal, existing allocation history is retained;
remaining charge balances and unallocated credit are displayed separately.
Reversal requires a reason and actor and never deletes the original receipt.

Monthly billing is idempotent per tenancy/month/type and clamps day 31 to the
last day of shorter months. Full-period billing requires a tenancy active on the
first day. Mid-month commencement requires an agreed manual first-period charge.
Automatic proration and late fees are deliberately absent.

Exact repeated statement files reuse the existing import. Overlapping files
produce duplicate-review candidates, not silently deleted receipts. Identical
legitimate payments can be confirmed separately with a detailed reason.
No stable bank-feed transaction IDs exist until a real provider is integrated.

Payments and billing hold an organization-level database lock. Unique idempotency
keys reject different payloads reusing a prior key. A duplicate network retry
returns the original payment. Transactional decisions create one posted payment.

This is an operational rent ledger, not a complete double-entry accounting system.
General credit notes, manual split-allocation editing, fiscal receipts and legally
compliant tax reporting are not implemented.

## Recurring tenant bills

`recurring_charges` configures a single fixed rule per tenancy/type (`water`,
`garbage`, `service`). Billing considers rent and each enabled, in-range rule
independently: an already generated rent charge must not prevent generation of
a missing extra bill. Existing charge uniqueness remains the authority, so a
manual bill is not duplicated by a recurring rule. Rule updates/deactivation are
audited and do not rewrite posted charges or allocations. Full-period tenancy
eligibility and shorter-month due-day clamping apply as for rent.

## Outgoing obligations and payments

`payables` records service bills, property operating costs, manual tax
obligations, individual loan instalments and personal/owner use. Amounts belong
to the organization's currency. `outgoing_payments` records actual manually
confirmed cash outflows, separately from incoming tenant `payments`.
Bill balance = bill amount minus non-reversed outgoing payments.
Overpayments and future/pre-issue payment dates are rejected.

Supplier invoice references, when provided, reject duplicate non-voided bills
for that provider. Organization locks protect aggregate balance decisions,
payment retries, reversals and voids. Separate organization-scoped idempotency
keys protect bill creation and outgoing payment recording; changed payloads
cannot reuse the same key. Original bill and payment records remain immutable
through the API. Reversals retain amount/reference/history with a reason.
Only an unpaid bill can be voided, and voided bills cannot receive payments.

Maintenance `cost` is reference information, not a bill or payment; it is never
added to cash outflow totals. A linked payable/outgoing payment supplies the
actual financial record. Supplier owed and last-paid aggregates exclude voided
bills/reversed payments and respect the reader's assigned-property scope.

Only owners may create/read/pay/reverse tax, loan and owner-use entries. A
property link does not make those categories visible to assigned staff.
Non-owner finance roles access only service/operating obligations on their
assigned properties. Contacts can be shared with authorized maintenance staff,
but financial aggregate fields are null for those staff.

Owner monthly cash movement = non-reversed, non-deposit incoming receipts dated
in the month minus non-reversed outgoing payments dated in the month, grouped
by category. It excludes opening balances and unrecorded transfers. Outstanding
and overdue payable totals span all recorded dates. It is not accounting profit
or an available bank balance; loans do not imply a complete principal schedule,
and recorded tax amounts do not establish compliance. Personal spending is one
owner-use outflow, not both a withdrawal and the subsequent expense.
