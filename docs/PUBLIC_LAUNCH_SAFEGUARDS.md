# Public-launch safeguards and pending business details

Updated November 15, 2026. This is an implementation inventory, not legal advice,
a compliance certificate, accessibility certification or a guarantee against claims.
Use synthetic records until the operator/legal/security release gates are met.

## Business details supplied by the owner

| Detail                                                                | Value                           |
| --------------------------------------------------------------------- | ------------------------------- |
| Supplied business name (legal registration unverified)                | JojoBuilds Landlord and Tenancy |
| Initial country                                                       | Kenya                           |
| Public support/privacy email                                          |                                 |
| Public business/service address                                       |                                 |
| Verified registered legal entity / registration number, if applicable |                                 |
| Retention periods and contact handling procedures                     |                                 |

Missing values are deliberately blank, not fabricated. Set public server-side
`BUSINESS_LEGAL_NAME`, `BUSINESS_CONTACT_EMAIL`, `BUSINESS_PUBLIC_ADDRESS` before
building for a real launch. Do not publish a private home address as a substitute.
The public policy pages show a development warning and missing-contact notice.

## Requested safeguards: implemented versus outstanding

| Area                     | Current treatment                                                                                                                                                 | Remaining gate                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Privacy                  | Public `/legal/privacy`, plain-language purposes/categories/access and offline risks                                                                              | Operator/provider identities, actual lawful bases, retention and rights handling need review                                 |
| Terms                    | Public `/legal/terms`, development scope and financial limits, no blanket rights waiver                                                                           | Reviewed commercial contract before selling                                                                                  |
| Cookies                  | Public `/legal/cookies`, session/OAuth lifetimes, storage choices and removal                                                                                     | Reassess after deployment and any tracker/provider change                                                                    |
| Cookie consent           | No optional trackers found in checked-in web source; no misleading Accept all banner                                                                              | Verify actual deployed responses, host-injected scripts and customer geography                                               |
| Optional storage consent | No automatic summary save or worker registration; separate enable/disable and unchecked Save summary choice                                                       | No analytics/marketing consent is implied                                                                                    |
| Refunds                  | Public `/legal/refunds`; no paid checkout/subscription sold; rent entries are not money collected by the app                                                      | Reviewed pricing, cancellation/refund/contact details before charging                                                        |
| Forms                    | Contextual data-minimization notice, invitation terms/privacy acknowledgment, optional email delivery unchecked                                                   | Client acknowledgment is not durable server-side evidence of a paid contract or marketing consent                            |
| Necessary data           | Offline storage uses selected aggregate totals, never contacts/tokens/documents; contact fields remain optional                                                   | Define per-workflow necessity; emergency contacts and free-text/uploads must not contain unrelated/sensitive data            |
| Analytics                | No application tracking scripts, pixels, fingerprinting or new analytics package                                                                                  | Disable/review host-injected analytics and log/IP retention at deployment                                                    |
| Third-party embeds       | No maps, video/social embeds or external image/font requests in checked-in web UI; CSP blocks frames                                                              | Reassess any future embed before loading it                                                                                  |
| Accessibility            | Skip link, visible focus, native labelled fields/dialogs, keyboard/Escape mobile menu with focus containment, reduced motion and responsive controls              | Full screen-reader, zoom, high-contrast, device/browser and all-workflow audit still needed                                  |
| Images / alt text        | Current artwork is CSS/decorative; app icons are locally generated; no stock-photo catalogue or missing HTML image alt attributes found in exercised public pages | New meaningful images need contextual alt text; retain evidence of rights for any future asset                               |
| Contrast                 | Darker muted/status/form text and borders; important actions are larger on phone                                                                                  | Targeted contrast checks are not a whole-app WCAG AA claim                                                                   |
| Button labels            | Existing explicit workflow labels retained; offline install/save/clear actions labelled; key payment action visible on phone                                      | Continue reviewing dense tables, validation and assistive-technology names in real user testing                              |
| Reviews/claims           | No customer testimonials, fake reviews or endorsement widgets found in checked-in web source; synthetic portfolio is labelled                                     | Do not imply bank verification, live delivery, production readiness, ODPC registration or guaranteed security                |
| Copyright                | CSS illustrations, generated JB icon and existing dependency icons; no external stock photos added                                                                | Verify brand/trademark rights and retain third-party licence notices; repository-wide asset/title clearance is not certified |
| Business details         | Supplied name and Kenya displayed; absent email/address remain blank                                                                                              | Verify and complete them before a public real-data service                                                                   |

## Kenya: applicable review topics, not a clearance decision

Initial customers are in Kenya. Review the Data Protection Act 2019 and applicable
2021 regulations, including controller/processor registration and exemptions,
privacy notices, lawful bases, minimization, access/correction/erasure/objection,
retention, security, processor contracts and cross-border hosting safeguards.
Do not infer that a small/free/local service is automatically exempt; determine
the operator's actual role and whether its property-management activities affect
registration obligations with ODPC or qualified Kenyan counsel.

Before selling, also review the Consumer Protection Act 2012 for marketing,
disclosures, internet agreements/cancellation and non-excludable rights; applicable
electronic-contract rules; copyright/trademark permissions; and duties under the
actual tenancy and service-provider agreements. Tax, client-money handling and
rent/deposit obligations require separate advice if the business model changes.
No subscription checkout or rent-transfer integration has been added here.
Customers outside Kenya can create additional obligations; UK/EU rules are not
automatically assumed to govern a Kenya-only service.

The conservative technical approach is to disclose essential requested sign-in
cookies, avoid trackers, and request a separate affirmative action before optional
device storage. The UK's ICO guidance supports this essential-vs-optional
distinction for its jurisdiction, but is not a Kenyan legal determination. Reject
optional trackers by default if introduced; consent must not be a condition for
unrelated necessary rental administration.

Primary starting points:

- Kenya Law, Data Protection Act: https://new.kenyalaw.org/akn/ke/act/2019/24
- Kenya Law, Consumer Protection Act: https://new.kenyalaw.org/akn/ke/act/2012/46
- ODPC: https://www.odpc.go.ke/
- ICO cookie/storage guidance (UK-specific): https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
- W3C contrast explanation: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html

Research limitation: live ODPC requests timed out or returned 404 for previously
documented links, and Kenya Law content could not be extracted in this session.
Current Kenyan provisions, amendments, registration classification and deadlines
therefore remain explicitly unverified. ICO/W3C and provider documentation was
retrieved, but does not replace local legal review. Do not mark the legal gate done.

## Pending operator checklist

- [ ] Supply and verify the blank business/contact fields above.
- [ ] Get Kenyan legal review of actual activities and proposed public terms/notices.
- [ ] Determine ODPC registration duties and complete any required registration.
- [ ] Agree controller/processor roles and actual hosting regions/providers/contracts.
- [ ] Establish retention, requests/export/deletion/closure, complaints and incident response.
- [ ] Configure and verify invitations/recovery delivery and accessible support.
- [ ] Test the actual HTTPS-hosted app for injected trackers, auth cookies, origin and isolation.
- [ ] Conduct full accessibility/device testing; current improvements are not certification.
- [ ] Complete PostgreSQL concurrency/restore, durable-storage, dependency and security gates.
- [ ] Review payment/refund/customer terms before enabling any paid offer.
