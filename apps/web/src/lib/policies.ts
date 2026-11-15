export const policyVersion = "2026-11-15";

export interface Policy {
  title: string;
  sections: { title: string; text: string }[];
}

export const policies: Record<string, Policy> = {
  privacy: {
    title: "Privacy policy",
    sections: [
      {
        title: "Current service and responsibility",
        text: "JOJOBUILDS is currently a development and synthetic-data demonstration service, not an approved service for real tenant records. A property operator determines why rental records are processed. A hosted service operator may process those records on their behalf. These responsibilities must be agreed before real use. Contact details and retention decisions below are incomplete; do not enter real personal data until the operator completes them.",
      },
      {
        title: "What the application processes",
        text: "Accounts use a name, email address, password hash and session records. Authorized rental workflows may contain property and unit details, tenant names, optional contact details, agreements, charges, payments, maintenance, messages and uploaded records. Only provide information needed for the task. Do not upload national IDs, card details, bank passwords, health information or unrelated personal documents. Technical security records can include network addresses, timestamps and request metadata.",
      },
      {
        title: "Purposes and lawful basis",
        text: "Records support access control, rental administration, financial recordkeeping, maintenance and security. Before real use, the operator must document the appropriate lawful basis for each activity, including any contract or legal obligation. Reading this notice is not blanket consent. Any future marketing or other optional processing needs its own appropriate basis and, where required, a separate freely given choice.",
      },
      {
        title: "Who can see records",
        text: "Access depends on organization, property and role. Property owners can review property-scoped conversations, including conversations between other participants. Messages are not confidential from the property owner. Hosting, database, storage and email providers may process information when configured; the operator must identify actual providers, locations and transfer safeguards before real use. Records are not intentionally sent to an AI service.",
      },
      {
        title: "Google and other optional services",
        text: "Google sign-in is optional and disabled until configured. Clicking Continue with Google takes you to Google, which applies its own privacy terms. The application requests basic identity scopes (openid, email and profile), verifies the identity and stores an account association. Existing password accounts must explicitly connect Google while signed in. Password sign-in remains available. No analytics, advertising pixels or third-party embedded media have been added to the application.",
      },
      {
        title: "Your device and offline summaries",
        text: "An offline summary is saved only when you explicitly choose Save summary. It contains selected totals, currency and reporting month, not names, contacts, messages, credentials, individual payments or uploaded files. The browser copy is not encrypted by the app and can be read by another person using the same browser profile. It expires on access after 24 hours, is replaced on the next save, and is cleared by sign-out or Clear saved summary. Other open tabs discard saved summaries on sign-out. Browser storage may be removed at any time. Downloaded summary backups are encrypted using the passphrase you choose; losing it means the file cannot be recovered.",
      },
      {
        title: "Retention, rights and complaints",
        text: "An operational retention schedule, verified support/privacy address, data-access/export process, correction, objection, erasure and account-closure procedures must be established before real records are accepted. Deactivating an account does not erase financial history. Contact your property operator for access or correction; where unresolved, you can raise a complaint with Kenya's Office of the Data Protection Commissioner. Do not send sensitive records to an unverified contact.",
      },
    ],
  },
  terms: {
    title: "Terms and conditions",
    sections: [
      {
        title: "Development service",
        text: "JOJOBUILDS currently provides an invitation-only development workspace for synthetic testing. No subscription purchase, uptime commitment or production-readiness certification is offered in this version. Do not rely on it as the sole ledger for a real tenancy. Public commercial use requires completed operator details and reviewed customer terms.",
      },
      {
        title: "Authorized use",
        text: "Use only accounts and organizations you are authorized to access. Provide accurate records, respect other people's privacy, keep credentials private and do not upload unlawful material or material you do not have permission to use. Property owners are responsible for authorized staff access and the lawfulness of records they enter.",
      },
      {
        title: "Financial limits",
        text: "Recorded payments and imported statements are bookkeeping entries, not proof of bank authentication or settlement. Review imports and confirm allocations. The app does not collect rent on your behalf, guarantee payment, provide tax/legal advice or replace your tenancy agreement. Corrections use supported reversal workflows.",
      },
      {
        title: "Offline use and backups",
        text: "Offline mode is a read-only copy of selected totals, may be stale and cannot accept or queue changes. It is not a full database backup. Losing browser storage or a device can remove it. Maintain independently verified backups of the database and uploaded files using the operator backup procedure. A downloaded summary cannot restore the rental ledger.",
      },
      {
        title: "Availability, changes and rights",
        text: "Development access may be interrupted, changed or withdrawn. Nothing here excludes rights or remedies that cannot lawfully be excluded, or limits responsibility where doing so is prohibited by applicable law. These terms do not establish a paid service contract, an exclusive court jurisdiction or a blanket waiver of consumer rights. Kenyan legal and consumer-law review is required before commercial launch; other laws may apply to customers elsewhere.",
      },
      {
        title: "Intellectual property and accessibility",
        text: "Keep rights to content you upload and ensure you have permission to share it. Third-party software retains its own licence terms. This version uses CSS illustrations and locally rendered icons, not licensed stock photographs or customer endorsements. Accessibility improvements are ongoing; no WCAG certification is claimed. Report access barriers to the operator once a verified contact is available.",
      },
    ],
  },
  cookies: {
    title: "Cookie and device-storage policy",
    sections: [
      {
        title: "Essential authentication cookies",
        text: "jojobuilds_session is a first-party HTTP-only sign-in cookie. Its default lifetime is 12 hours, subject to server configuration, expiry and revocation. When you choose Google sign-in, jojobuilds_google binds the authorization attempt to your browser for up to 10 minutes and is removed on callback. Production requires secure cookies over HTTPS. Blocking these cookies prevents the corresponding sign-in features from working.",
      },
      {
        title: "Optional offline storage",
        text: "No rental summary is saved automatically. Save summary is an explicit opt-in after a shared-device warning. One selected read-only summary is stored on the device for up to 24 hours on access. Clear saved summary withdraws this choice. Enabling offline app access separately saves only the public offline screen and application assets in a service-worker cache; it never caches authenticated API responses, passwords, session responses, invitation links or uploaded documents. Disable offline app access removes that app cache and the saved summary.",
      },
      {
        title: "Tracking choices",
        text: "The application currently contains no analytics, advertising cookies, fingerprinting scripts, embedded maps, video players or social widgets. There is therefore no Accept all tracking banner. Essential sign-in cookies are explained rather than represented as optional. Offline storage is separately user-requested. Reassess consent and block any optional tracker before loading it if tracking or embeds are introduced. A hosting provider's own logging or injected analytics must also be reviewed before deployment.",
      },
      {
        title: "Control",
        text: "Use the Offline and installation controls to remove app storage and your browser settings to remove site data or cookies. Clearing a browser does not delete server records or encrypted files you downloaded. Google can set its own cookies when you choose to visit its sign-in service.",
      },
    ],
  },
  refunds: {
    title: "Refund policy",
    sections: [
      {
        title: "No paid subscriptions in this version",
        text: "This development version does not sell subscriptions, accept checkout payments or charge an application fee. There is no application purchase to refund. Do not send money to anyone claiming that this page authorizes a JOJOBUILDS subscription payment.",
      },
      {
        title: "Rent and deposits are separate",
        text: "Rent, deposits and provider payments recorded in the workspace are not payments collected by JOJOBUILDS. Questions about them belong with the relevant landlord or service provider under the applicable agreement and law. A bookkeeping reversal is not a transfer of money or a completed refund.",
      },
      {
        title: "Before charging customers",
        text: "The operator must publish verified business/contact details, prices, cancellation procedures, refund eligibility and timelines before enabling any paid service. Nothing in this policy removes mandatory consumer rights. No blanket no-refunds rule applies.",
      },
    ],
  },
};
