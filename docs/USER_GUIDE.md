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
2. In **Properties**, add a property and its location, then add units. Choose
   **Residential** or **Commercial**, a **Unit label** and a **Unit specification**.
   For example: A01 / 1-bedroom apartment, S12 / rental stall, or B01 / bar premises.
   Each unit has its own default monthly rent; one property can contain both uses.
3. In **Tenants**, register each tenant. Registration alone does not send an
   invitation and does not create a rent obligation.
4. Choose **Assign tenancy**. Select the tenant and vacant unit; enter agreed
   rent, start date, deposit where applicable and a unique payment reference.
5. Keep that payment reference consistent with the reference tenants include in
   their bank transfer descriptions.

The website accepts normal major-unit amounts such as `25000.50`. The API stores
minor units, so an API client must send `2500050` for that same KES amount.
Never multiply an amount twice when writing an integration.

### Unit specifications, tenants and other bills

In **Properties -> View units**, each unit shows its label, use, specification,
building/floor and assigned tenant. Authorized roles also see default rent and
the tenant's agreed rent separately. **Edit unit** changes the unit description
or default rent; it never changes existing tenancy rents or generated bills.
Units cannot be moved to another property.

Use **Assign tenant** on a vacant unit to start an agreement with that unit and
its default rent preselected. An existing tenant may rent several units, including
units at different properties. Register the person once and make a separate
agreement/payment reference for each rented unit.
The staff tenant directory lists all active units/references and totals their
agreed monthly rents, rather than showing only the first unit.

Finance roles can use **Add bill** or **Set recurring bill** on an assigned unit;
the correct tenancy is preselected. Water, garbage and service charges belong to
that agreement, not the whole property or the next occupant. The unit shows
recurring rules separately from extra bills generated for the selected reporting
month, so a rule and its generated bill are not counted twice. Generating monthly
rent/bills is still required to turn a recurring rule into an actual charge.
Record a tenant before adding tenancy bills to a vacant unit.

Existing units migrate as Residential. Review and edit any existing commercial
units rather than assuming their free-text descriptions can be safely classified.
Caretakers/maintenance see assigned tenant/unit information, not these financial
details or bill controls.

### What tenants see

The tenant website uses **My rentals**, not a landlord's property portfolio.
Each card represents one rented unit, with its location, specification, agreed
monthly rent, due day, payment reference, rental dates, contact and own balances.
It does not show building-wide occupancy or other tenants' finances. Active,
upcoming and ended agreements remain available through the rental-status filter.

**View rent & bills** opens **My payments** filtered to that agreement.
**Rental account -> All my rentals** restores the combined view. Invoice rows,
arrears, payment history and recurring rules identify the rental location/unit;
**Export full ledger** exports all of the tenant's own agreements, even when the
screen is filtered. Rental-card balances are all-time unpaid rent and extra bills,
excluding deposits; they are not limited to the reporting month.

## Monthly rent routine

1. Select the reporting month.
2. Open **Payments** and choose **Generate rent**. This creates eligible monthly
   rent and enabled recurring extra charges; it does not collect money. Repeating
   it does not duplicate that tenancy's existing monthly charge of the same type.
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

Create a maintenance request, choose its property and **Tenant / unit** where
applicable, and record the issue. Leave the tenant blank only for a common-area
request. Cards show the property, tenant name and unit. Tenants must select their
own tenancy; they see only requests linked to their own tenancy, not common-area
requests or another tenant's requests.

Authorized staff can assign a registered service provider or enter another
worker's name, progress valid statuses and add tenant-visible notes. The
**Recorded cost** is an estimate/reference, not evidence of an outgoing payment.
Record an actual supplier obligation/payment under **Service providers**.

Notifications are visible inside the app. SMS, WhatsApp and push delivery are
not active.

## Water, garbage and other tenant bills

Open **Recurring bills -> Set recurring charge**, choose a tenancy and type
(`water`, `garbage` or `service`), and enter the fixed monthly amount, due day and
first month. An optional last month limits the rule. Choose **Generate rent &
bills** for the selected reporting month; the existing **Generate rent** action
and administration `bill` job include these rules too.

There is one rule per tenancy/type. Use **Edit / disable rule** to change future
generation. Already generated charges and their payment allocations never
change. A due day of 31 becomes the final day of a shorter month. An enabled
rule only generates within its configured month range and tenancy eligibility.

For a variable water bill, choose **Add variable bill**, enter the actual amount,
type, month and due date. Meter readings and automatic usage calculation are not
implemented. Do not create both a fixed and variable bill of the same type for
the same tenancy/month: one monthly charge per type is allowed. Other differently
named fees must be combined into the one monthly `service` charge.

Tenants see their own recurring rules and generated charges, including the
separate bill type and outstanding amount. Rent-purpose receipts settle both
rent and non-deposit bills oldest-due-first.

## Service providers, jobs and money owed

In **Service providers**, add plumbers, electricians, security companies or other
contacts. Record the company/person name, trade, contact person, phone, email,
address and staff-visible notes. Providers have no accounts or sign-in.
Archive a provider rather than deleting its history.

Link a provider in a maintenance update to associate that job with the directory.
Then choose **Add provider bill**, select the property, optionally link the
matching maintenance job, and record the invoice amount, reference and due date.
A nonempty invoice reference cannot be recorded twice for the same provider
while the earlier bill remains valid.

Choose **Record outgoing payment** only after paying the provider outside the
application. Record amount, date, method and reference. Partial payments reduce
the balance; provider cards show the remaining amount owed and latest
non-reversed payment date. **Payment history** retains all entries and reversals.
The application does not transfer money or verify the provider's receipt.

For corrections, reverse the outgoing entry with a reason. This does not reverse
the actual bank/M-Pesa transfer. An unpaid incorrect bill can be voided with a
reason; reverse any payments first. History is preserved.

Directory contacts are shared with authorized maintenance staff. Financial
amounts are limited to owner/manager/finance roles and their property scope.
Tenants and agents cannot access this directory or supplier financial records.

## Owner finances: tax reminders, loans and personal use

**Owner finances** is visible and accessible only to the portfolio owner.
Managers, finance staff, maintenance staff and tenants cannot read these private
tax, loan or personal-use records, including through the API.

Use **Add obligation / owner use** and choose:

- **Tax:** enter an amount you have independently determined and its due date.
- **Loan:** record an individual planned repayment instalment and due date.
- **Personal / owner use:** describe spending funded from property income, such
  as groceries or school fees, and enter the amount.
- **Property operating cost:** select its property; this is not owner-private
  and authorized finance staff can access it through the scoped finance API.

Creating an entry records an obligation/planned amount. Record each payment
actually made to move it into that month's cash movement. Property/source is
optional for private owner entries; it does not establish a bank funding link.
For a personal expense, record one outflow: do not record both a withdrawal and
its subsequent spending as two costs.

The monthly summary separates non-deposit incoming receipts, supplier payments,
operating costs, taxes, loan instalments and personal use. Net recorded movement
is incoming receipts minus these outgoing payments. It is not cash available,
bank balance, accounting profit, full loan principal or a tax return. Outstanding
and overdue obligation totals cover all recorded dates, not just the selected
reporting month. Bill lists show the latest 1,000 records; summary totals cover
all authorized records.

No tax-rate calculation, interest amortization, tax filing, statutory compliance
certification or loan-provider connection is implemented. Keep evidence and
obtain the appropriate qualified advice separately.

## Staff and tenant access

The owner manages invitations under **Settings & access**. Select the intended
role and permitted properties. For tenant access, select the existing tenant
record; tenants use the website, not the landlord Android client.
Tenant invitations show only the tenant selector; staff invitations show only
property assignment. Switching roles clears the inapplicable selection. Use the
tenant record's email for a tenant invitation. Tenant access follows their own
tenancy, not a staff property assignment.

Invitations and password recovery queue messages in the email outbox. They do
not arrive until SMTP and the mail worker are configured and verified. See
[local email](LOCAL_DEVELOPMENT.md#local-email) and [production email](DEPLOYMENT.md#email-and-scheduled-jobs).
Use the local administration password-reset command only for accounts you are
authorized to administer.

### Try the tenant website locally

Use a synthetic portfolio created with `seed`, not a real portfolio. If you have
not created the demo owner yet, run:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject\apps\api
$env:DATABASE_URL = 'sqlite:///./data/jojobuilds.db'
.\.venv\Scripts\python.exe -m app.cli seed --email "demo-owner@example.com" --name "Demo Owner"
```

Choose a private password when prompted. If that account already exists, do not
seed it again. Then create a separate tenant login:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject\apps\api
$env:DATABASE_URL = 'sqlite:///./data/jojobuilds.db'
.\.venv\Scripts\python.exe -m app.cli demo-tenant --owner-email "demo-owner@example.com" --email "demo-tenant@example.com"
```

Choose the tenant password at the prompt. If your synthetic owner uses a
different email, substitute that email in `--owner-email`. The command links an
unlinked active synthetic tenant and creates a genuine tenant membership; it
does not impersonate an owner and refuses real/non-demo organizations. If the
owner has several demo portfolios, supply the chosen organization UUID using
`--organization`. Existing accounts are not overwritten; use `set-password`
when you are authorized to change one.

Sign out of the owner account, or use a private/incognito browser window. Open
`http://localhost:3000` and sign in as **demo-tenant@example.com** with the password
you chose. The tenant sees **My home**, their own payments/charges, recurring
bills, maintenance and notifications. Provider and owner-finance pages are
absent and access is denied server-side. Use the invitation workflow for real
tenants; `demo-tenant` is only a local demonstration aid.

To add a mixed residential/commercial example to the linked tenant who rents
at Kilimani Heights, first make a backup, then run:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject\apps\api
$env:DATABASE_URL = 'sqlite:///./data/jojobuilds.db'
.\.venv\Scripts\python.exe -m app.cli demo-rentals --owner-email "demo-owner@example.com" --email "demo-tenant@example.com"
```

The example preserves the Kilimani agreement and labels a generic Residential
unit as a 1-bedroom apartment. It adds a rental stall at **Utawala Stalls**
(KES 15,000/month; KES 500 garbage) and bar premises at **Bypass Bar**
(KES 80,000/month; KES 2,500 service), all for the same tenant. These are fictional
sample amounts, not recommendations. New agreements start on the first of the
current portfolio-local month; ordinary current-month charges are generated.
Repeating the command does not duplicate agreements or bills, change passwords,
or rewrite previous payments/charges. It refuses real portfolios, missing linked
tenant accounts and conflicting example names/references. Substitute your actual
synthetic emails and add `--organization` when needed. Refresh/sign in using the
existing tenant account afterward.

### Try staff views locally

Use the same synthetic demo owner as the tenant example. Create a staff account
assigned to one named demo property:

```powershell
Set-Location C:\Users\joanmoturi\Downloads\myproject\apps\api
$env:DATABASE_URL = 'sqlite:///./data/jojobuilds.db'
.\.venv\Scripts\python.exe -m app.cli demo-staff --owner-email "demo-owner@example.com" --email "demo-manager@example.com" --role manager --property-name "Kilimani Heights"
```

Choose a private password of at least 12 characters when prompted. Sign in at
`http://localhost:3000` in a separate private/incognito browser session with
**demo-manager@example.com** and that password. This is a real scoped staff
membership, not an owner role-switch or impersonation.

Supported roles are `manager`, `agent`, `finance`, `caretaker` and `maintenance`.
To try a different role, rerun the command with that `--role` and a **different
email**, e.g. `demo-caretaker@example.com`. Existing accounts are never
overwritten. The property name must match exactly one active property in the
selected demo organization; choose a different demo property if desired.
The command refuses non-demo portfolios and cannot create another owner.

Managers/finance can see authorized financial records; caretakers/maintenance
see assigned-property maintenance without tenant financial records; agents
manage scoped tenancies without financial access. No staff role sees private
owner tax/loan/personal-use records. Staff without a property assignment have
no property access. Your owner account remains unchanged.

Use ordinary invitations and verified email delivery for real staff. These
demo commands do not send email or configure SMTP.

## Android version

The native landlord/staff client uses the same backend, not a separate rent
ledger. Under **More**, open **Service providers & bills**, **Recurring & variable
tenant bills** or, as owner, **Private owner finances**. Contacts, bills, partial
payments, reversals/voids and recurring-rule editing are available there.
Maintenance shows tenant/unit details and supports registered provider assignment.

See [Run on Android](RUN_ON_ANDROID.md) for Expo Go and phone-browser instructions.
Source/bundle verification is not proof of physical-device behavior; no signed
APK has been installed here. Tenants currently use the responsive website.

## WhatsApp integration boundary

WhatsApp is not active; no external messages are sent. Adding an adapter is a
moderate integration project, not a login toggle. Plan authorized provider
onboarding, a production HTTPS webhook, webhook signature validation, protected
server credentials, recorded messaging preferences/consent, approved templates,
opt-out handling, delivery status, retries and duplicate suppression.

Before activation, check the current
[WhatsApp Business Messaging Policy](https://business.whatsapp.com/policy)
and [platform pricing](https://business.whatsapp.com/products/platform-pricing).
Business-initiated conversations require approved templates; free-form replies
are limited to the customer-service window. Pricing varies by message category
and recipient market; no fixed Kenyan message rate is promised here.
Debt-collection and sensitive-information restrictions need use-case review:
do not assume automated arrears chasing is permitted. A cautious first scope is
permitted maintenance updates, with recipient permission and template approval.

[Meta's official examples](https://github.com/fbsamples/whatsapp-api-examples)
include templates, incoming webhooks and signature validation. They are reference
material, not an activated JOJOBUILDS integration or a substitute for reviewing
current provider requirements.

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
