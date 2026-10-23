# JOJOBUILDS user guide

JOJOBUILDS keeps property, tenant, rent and maintenance records in one backend.
The website and Android client use that same database. It is not a bank, bank
balance viewer or full accounting package.

This guide covers the owner/staff workflows and local account demonstrations.
For a tenant-facing handout without administration commands, use the
[tenant guide](TENANT_GUIDE.md). The [documentation index](README.md) links all
setup, developer and operations guides.

## In this guide

- [Roles and the records you manage](#roles-and-the-records-you-manage)
- [First-time setup](#first-time-setup-in-the-website)
- [Unit specifications and other bills](#unit-specifications-tenants-and-other-bills)
- [Worked example: one tenant, three rentals](#worked-example-one-tenant-three-rentals)
- [Monthly rent routine](#monthly-rent-routine)
- [Incoming payments](#record-money-you-received) and [statement reconciliation](#import-and-reconcile-a-bank-statement)
- [Maintenance](#maintenance-and-notifications), [extra bills](#water-garbage-and-other-tenant-bills) and [service providers](#service-providers-jobs-and-money-owed)
- [Property conversations and owner oversight](#property-conversations-and-owner-oversight)
- [Private owner finances](#owner-finances-tax-reminders-loans-and-personal-use)
- [Staff/tenant access and demonstrations](#staff-and-tenant-access)
- [Troubleshooting](#troubleshooting-everyday-workflows)

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

## Roles and the records you manage

| Role                    | Main responsibility                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner                   | Organization-wide property, tenant and finance management; invitations; private owner finances.                                                           |
| Manager                 | Operations employee: assigned-tenant read-only balances, tenant messages and maintenance/provider coordination. No payment handling or agreement editing. |
| Finance                 | Work with assigned-property financial records; no private owner entries or unit/provider-directory editing.                                               |
| Agent                   | Manage assigned-property tenants and agreements, not tenant payment/charge ledgers or supplier finances.                                                  |
| Caretaker / maintenance | Assigned-property units, linked tenant names, maintenance and provider contacts; no bill/payment controls.                                                |
| Tenant                  | Their own rental agreements, bills, payment history, messages and maintenance through the website.                                                        |
| Service provider        | Separate website portal: assigned requests, management messages, quotation/invoice submissions and their own service bills/payments only.                 |

Not every role sees every page or action. Select the correct workspace before
entering records. Staff need a property assignment; creating an account does
not itself grant access to every property. Providers such as plumbers can be
invited separately; their login does not grant staff membership.

### Manager balances and tenant messages

Managers start on **Tenant balances**, showing outstanding/overdue non-deposit
balances for assigned rentals only. They cannot see default/agreed rents,
deposits, receipt ledgers, supplier finances or owner-private records. Property,
unit and agreement edits are owner/authorized-agent workflows, not manager tasks.

### Property conversations and owner oversight

Open **Messages** to start or reply to a property conversation. Choose the
recipient and property/rental/job. Managers can message owners, linked tenants
and assigned providers; tenants can message owners and assigned managers;
providers can message owners and assigned managers. Owners can message all
relevant users; other assigned staff can message the owner.

Owners see all conversations for their properties. Conversations between other
users are labelled **Owner oversight - read-only**; start a separate conversation
to send your own message. Everyone sees this oversight disclosure. New shared
conversations deliver in-app, not through email or WhatsApp.

Select **New conversation**, choose **Recipient and property**, enter your message
and select **Send message**. Open a thread from the inbox to reply. Owners can
select **My conversations only** to hide observed threads. The inbox refreshes
periodically; **Refresh inbox** retrieves updates immediately.

Recipients follow active access: managers only see assigned properties; tenant
contacts follow linked rental agreements; provider contacts follow assigned
service jobs. Revoked access or reassignment removes affected conversations from
participants' inboxes, while the owner retains oversight. Do not put tenant-facing
conversation content into a job's private management response, or supplier prices
into tenant-visible progress notes.

### Tenant notices and email history

For the original email-capable notices, expand **Tenant notices and email history**,
choose the tenant and unit, and enter a subject and body.
Linked tenants see it in **Messages** with an in-app notification. Email is
queued when requested, an address exists and SMTP is configured. The result
states each channel; "queued" does not mean delivered. If neither channel is
available, link the tenant account or configure email first. Use **Maintenance**
to send a complaint to a registered provider and inspect their response.

| Record                     | Meaning                                                       | Example                                 |
| -------------------------- | ------------------------------------------------------------- | --------------------------------------- |
| Property                   | The overall location/building/complex                         | Kilimani Heights                        |
| Unit                       | An individually rentable space with a label and specification | A01 / 1-bedroom apartment               |
| Tenant                     | The person or business renting space; register once           | Alex Demo, a synthetic example          |
| Tenancy / rental agreement | Connects a tenant to a unit, agreed rent, dates and reference | Alex renting A01                        |
| Charge / tenant bill       | Money due from that agreement                                 | Monthly rent or a water bill            |
| Recurring rule             | Instructions to generate a future monthly extra charge        | KES 500 garbage each month              |
| Provider bill / payable    | Money owed by the owner/portfolio to someone else             | A plumber's invoice                     |
| Payment                    | An actual receipt or outflow recorded after checking evidence | Tenant bank receipt or supplier payment |

Incoming tenant receipts and outgoing supplier/owner payments are separate.
Adding a charge or obligation never proves that money has moved.

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

## Worked example: one tenant, three rentals

These fictional amounts illustrate a workflow, not pricing advice. Use a
synthetic portfolio only. If the sample rentals already exist, inspect them
rather than creating duplicate properties, people or agreements.
The optional `demo-rentals` command adds the stall/bar examples; the apartment's
water bill below is a separate manual example, not a promised seeded record.

| Property         | Unit label | Use / specification               | Agreed monthly rent | Extra bill for this example  |
| ---------------- | ---------- | --------------------------------- | ------------------- | ---------------------------- |
| Kilimani Heights | A01        | Residential / 1-bedroom apartment | KES 45,000          | Variable water: KES 2,000    |
| Utawala Stalls   | S01        | Commercial / rental stall         | KES 15,000          | Recurring garbage: KES 500   |
| Bypass Bar       | B01        | Commercial / bar premises         | KES 80,000          | Recurring service: KES 2,500 |

### Set up the agreements

1. In **Properties**, create or locate each property. Use **Add unit** or
   **View units -> Add unit here** to enter its use, label, specification,
   building/floor and default monthly rent.
2. In **Tenants**, register the synthetic tenant once, or reuse the existing
   Alex Demo record. Do not register a new person just because they rent
   another unit.
3. For each vacant unit, open **View units -> Assign tenant**, select that
   same tenant and check the preselected rent. Enter distinct payment
   references, dates and due day. Reuse existing agreements if already present.
4. For this example, assume all three agreements are eligible for a full
   reporting month. A real mid-month start needs an agreed manual first-period
   charge instead of automatic proration.
5. Confirm the **Tenants** row lists all three units/references. Its combined
   agreed monthly rent is KES 140,000; this figure does not include extra bills.

The unit's default rent is a starting value, not the agreement itself. If you
later edit S01's default from KES 15,000 to KES 17,000, its existing KES 15,000
agreement and generated charges remain unchanged.

### Add the extras and generate the month

1. Select the reporting month.
2. On A01, choose **Add bill**. Check the preselected tenancy, select `water`,
   enter KES 2,000, a description, billing month and due date, and save.
3. On S01, choose **Set recurring bill**, select `garbage`, enter KES 500 and
   the first billing month/due day, and save. If the example rule already
   exists, inspect it instead of adding another one.
4. On B01, configure `service` at KES 2,500 in the same way.
5. Open **Recurring bills -> Generate rent & bills**, or use **Payments ->
   Generate rent**. Check the resulting invoices rather than assuming that
   saving a rule created a bill.

For this tenant and month, rent is KES 140,000 and extra bills are KES 5,000:
KES 145,000 total, assuming no other charges. A recurring rule and its generated
invoice are not two separate debts.

### Record and check a payment

1. After checking a real receipt in a real workflow, use **Record payment**
   and choose the stall agreement, not the apartment or bar. For a synthetic
   exercise, use only clearly fictional evidence/references.
2. Record a KES 10,000 rent-and-bills receipt against the stall.
3. With no earlier debt, credit or other charges, that stall's KES 15,500
   invoice total now has KES 5,500 remaining. Allocation is oldest-due-first;
   do not assume a receipt settles rent before every extra charge.
4. Sign in separately as the linked tenant. **My rentals** should distinguish
   the apartment, stall and bar. **View rent & bills** on S01 selects only the
   stall account; **All my rentals** restores the combined view.

Existing demo history can include other months, credits or receipts, so its
all-time rental-card balances need not equal this single-month illustration.

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
address and staff-visible notes. Only owners edit directory records or invite login access.
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
amounts are limited to owner/finance roles and their property scope.
Tenants and agents cannot access this directory or supplier financial records.

### Give a provider a login

Save the provider's exact sign-in email, then select **Invite provider login**.
Run the email worker and verify delivery, or inspect development mail locally.
The invitation creates a provider link, not an employee role. Existing users
sign in with the invited email and accept; never create/reset another account
for each landlord. New users set a password or use configured Google sign-in.

Providers see **My service work**, grouped by landlord, and only requests
assigned to their directory record. They can accept/decline and update progress;
management closes the job. Response notes are private to staff; progress notes
are visible to the linked tenant. The **Messages** view supports private
management/provider conversations, subject to owner oversight.

For an accepted job, the provider submits an itemized quotation. The owner opens
**Maintenance -> Quotations and invoices**, reviews the items/total and records
an approval or rejection with a note. Approval creates one unpaid service bill;
do not add the same bill manually. Rejected quotations can be revised.

The provider then submits an invoice referencing the approved quotation.
Invoice approval links the same bill, never a second liability. Invoice amounts
cannot exceed or change the approved items; a rejected invoice can be revised.
Approval is not a payment. Record actual payments through the existing
**Service providers** bill controls after paying outside JOJOBUILDS.

Providers see **Services pending**, **Services paid**, and **Voided services**
with their own amounts and payment/reversal history. Managers cannot see these
financial documents or approve them. Owner-private finances remain inaccessible.
Use **Revoke portal access** to block a relationship and pending invitations.
Revoke before changing an already linked sign-in email, then reinvite.
See the shareable [service-provider guide](PROVIDER_GUIDE.md).

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
[local email](LOCAL_DEVELOPMENT.md#local-email) and [production email](DEPLOYMENT.md#7-email-and-scheduled-jobs).
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

Finance staff can see authorized financial records; managers instead see
read-only balances and communication/coordination tools. Caretakers/maintenance
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
Managers use **Balances** or **More -> Property messages & tenant balances** for reminders,
without loading financial ledgers. Owner/staff permissions match the backend.

See [Run on Android](RUN_ON_ANDROID.md) for Expo Go and phone-browser instructions.
Source/bundle verification is not proof of physical-device behavior; no signed
APK has been installed here. Tenants and providers currently use the responsive
website; Google sign-in/connect is also web-only and disabled without server credentials.

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

## Troubleshooting everyday workflows

| Symptom                                                                 | Check / action                                                                                                                                             |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A property says Residential but contains a shop/bar                     | Open View units and edit that unit's use to Commercial. Existing units migrate as Residential; free-text descriptions are not automatically classified.    |
| Default rent changed but tenant rent did not                            | Expected: default prices do not modify existing agreements or bills. Check the agreed rent shown on the unit.                                              |
| A unit has no Add bill button                                           | It needs an active linked agreement, and the signed-in role must have finance permission.                                                                  |
| A recurring rule exists but the month's charge is missing               | Check its enabled flag, first/last month and tenancy eligibility; then generate that month. Mid-month starts require an explicit first-period charge.      |
| A second water/garbage/service bill is rejected                         | One charge per tenancy, month and type is allowed. Review the existing charge instead of posting another description for the same type.                    |
| A tenant is missing one of their rentals                                | Check the workspace, rental filters, linked tenant record and agreement. Add the agreement to the existing person rather than creating a duplicate tenant. |
| A manager sees no properties                                            | Check the selected organization and intended staff assignment with the owner. An account alone does not grant property access.                             |
| No invitation or recovery email arrives                                 | Check the configured SMTP/outbox worker and recipient address. Queued mail is not delivered mail.                                                          |
| A provider's amount owed did not change after a maintenance cost update | Maintenance cost is a reference only. Record the actual payable and outgoing payment under Service providers.                                              |
| An owner expense does not reduce this month's cash movement             | An obligation is not a payment. Check whether an outgoing payment was recorded and its date falls within the selected month.                               |
| A private owner entry appears unavailable to staff                      | Expected: tax, loan and owner-use entries are owner-only, even when property-linked.                                                                       |
| Importing a statement did not settle a balance                          | Imported rows require review and explicit confirmation; suggestions are not proof of payment.                                                              |
| A ledger export contains more rentals than the screen                   | Export full ledger includes all authorized agreements; the tenant rental filter is a screen filter only.                                                   |

For connection errors, account setup or a failed restart, use
[Run on PC](RUN_ON_PC.md#common-problems). Do not delete the local database,
reseed an existing account or bypass access controls to make a screen work.
For developer details, see [API reference](API_REFERENCE.md) and
[Financial model](FINANCIAL_MODEL.md).

## Backups and limits

Read [Backup and restore](BACKUP_AND_RESTORE.md). Protect exports and backups as
confidential records; the local ZIP backup is not encrypted.

The current implementation does not include live bank feeds, automatic payment
collection, a complete journal/general ledger, deposit refunds, commercial
subscriptions or every workflow from the original product brief. Review
[Security](SECURITY.md) and the [post-build checklist](POST_BUILD_CHECKLIST.md)
before using real tenant information.
