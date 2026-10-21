# Financial model

Amounts are positive integer minor units (KES 1.00 = 100). Invoice/charge, observed
bank transaction, posted payment and charge allocation are different concepts.
No `is_paid` field is a source of truth.

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
