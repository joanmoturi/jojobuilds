# JOJOBUILDS user guide

JOJOBUILDS keeps property, tenant, rent and maintenance records in one backend.
The website and Android client use that same database. It is not a bank, bank
balance viewer or full accounting package.

## Choose your starting point

| What you want                                         | Read                                            |
| ----------------------------------------------------- | ----------------------------------------------- |
| Open the app on this Windows PC                       | [Run on PC](RUN_ON_PC.md)                       |
| Test the native app or website on an Android phone    | [Run on Android](RUN_ON_ANDROID.md)             |
| Make it available to people outside your home network | [Deployment](DEPLOYMENT.md)                     |
| Build an installable Android APK                      | [Android builds](mobile/ANDROID_BUILD.md)       |
| Check what is unfinished or requires your action      | [Post-build checklist](POST_BUILD_CHECKLIST.md) |

Use synthetic records first. A demo organization is marked with a demo banner.
Do not turn a demo ledger into a real one by renaming its tenants; create a
separate clean owner/portfolio when you are ready.

## First-time setup in the website

1. Sign in with an account you created using `bootstrap` or `seed`, or accepted
   through an invitation. There is no shipped default email/password.
2. In **Properties**, add a property and its location, then add units. Unit
   numbers identify individual apartments/rooms; a property can have several.
3. In **Tenants**, register each tenant. Registration alone does not send an
   invitation and does not create a rent obligation.
4. Choose **Assign tenancy**. Select the tenant and vacant unit; enter agreed
   rent, start date, deposit where applicable and a unique payment reference.
5. Keep that payment reference consistent with the reference tenants include in
   their bank transfer descriptions.

The website accepts normal major-unit amounts such as `25000.50`. The API stores
minor units, so an API client must send `2500050` for that same KES amount.
Never multiply an amount twice when writing an integration.

## Monthly rent routine

1. Select the reporting month.
2. Open **Payments** and choose **Generate rent**. This creates eligible monthly
   charges; it does not collect money. Repeating it does not duplicate that
   tenancy's monthly rent charge.
3. Check the charges before recording receipts.
4. Review outstanding balances and arrears after reconciling payments.
5. Export the ledger and make a backup at your agreed frequency.

Mid-month tenancy starts require an explicitly agreed manual first-period charge;
the app does not invent a prorating policy. Verify final-period bills when ending
a tenancy. Deposits are separate from rent, and automatic deposit refunds are not
implemented.

## Record money you received

Use **Record payment** only after checking the actual source evidence. Choose
the correct tenancy, amount, receipt date, method and transaction reference.
Select the correct rent/deposit purpose where offered.

Rent payments settle oldest eligible rent/bill charges first. Partial payments
leave a balance. An overpayment can leave unallocated credit; it is not extra
rent income or an automatic refund. Deposit receipts do not settle rent.

For a mistake, open payment details and use the authorized **Reverse** action
with a reason. Do not create a second negative payment or delete financial
history. A printable acknowledgement records what the app says was received;
it is not independent bank confirmation.

Selecting M-Pesa as the method records a manually checked M-Pesa receipt. It does
not activate Daraja or verify a provider transaction.

## Import and reconcile a bank statement

1. Obtain a CSV or XLSX export from your bank. PDF/OCR import is not implemented.
2. Open **Payments -> Import statement**. Select the property and a stable bank
   account nickname. A nickname is not an account connection.
3. Upload the file, read headers, map columns and select the correct date and
   decimal formats.
4. Preview the normalized rows and fix rejected rows before importing.
5. Import for review, then open **Reconcile**.
6. For each incoming payment, check source evidence, tenancy and duplicate
   warnings. Enter a reason and explicitly confirm, reject or defer it.
7. Compare the resulting balances with your bank records.

A minimal synthetic CSV looks like this:

```csv
date,amount,description,reference
2026-10-01,25000.00,Rent JOJO-A101,BANK-EXAMPLE-001
```

Create a matching synthetic tenancy/reference to try this example. The amount
column is signed major units: positive for incoming money and negative for
outgoing money. Current imports are limited to 5 MB and 5,000 rows. A file with
invalid normalized rows must be corrected before import.

Repeated identical files are recognized for the same account label.
Overlapping statements and duplicate-looking transactions still require review.
If you already entered a receipt manually, check carefully before confirming the
same bank transaction again.

The fresh-statement reminder is a reminder, not a scheduled bank download.
Uploaded statements remain user-supplied evidence; the app does not claim that
the bank authenticated them.

## Maintenance and notifications

Create a maintenance request, choose its property/unit where applicable and
record the issue. Authorized staff can progress a request through the allowed
statuses, add tenant-visible updates and record supported costs.

Notifications are visible inside the app. SMS, WhatsApp and push delivery are
not active.

## Staff and tenant access

The owner manages invitations under **Settings & access**. Select the intended
role and permitted properties. For tenant access, select the existing tenant
record; tenants use the website, not the landlord Android client.

Invitations and password recovery queue messages in the email outbox. They do
not arrive until SMTP and the mail worker are configured and verified. See
[local email](LOCAL_DEVELOPMENT.md#local-email) and [production email](DEPLOYMENT.md#email-and-scheduled-jobs).
Use the local administration password-reset command only for accounts you are
authorized to administer.

## What the numbers mean

| Label              | Meaning                                                             |
| ------------------ | ------------------------------------------------------------------- |
| Billed             | Charges in the selected reporting period                            |
| Allocated          | Confirmed receipts applied to those charges                         |
| Cash received      | Recorded, non-reversed rent-purpose receipts received in the period |
| Outstanding        | Remaining eligible charge balance                                   |
| Unallocated credit | Money not yet applied to eligible charges                           |
| Pending review     | Imported transactions still requiring a decision                    |

These figures are not your bank account's balance. Changing the reporting month
can change period totals without deleting records.

## Backups and limits

Read [Backup and restore](BACKUP_AND_RESTORE.md). Protect exports and backups as
confidential records; the local ZIP backup is not encrypted.

The current implementation does not include live bank feeds, automatic payment
collection, a complete journal/general ledger, deposit refunds, commercial
subscriptions or every workflow from the original product brief. Review
[Security](SECURITY.md) and the [post-build checklist](POST_BUILD_CHECKLIST.md)
before using real tenant information.
