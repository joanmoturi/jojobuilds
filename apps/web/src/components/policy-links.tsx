import Link from "next/link";

export function PolicyLinks() {
  return (
    <nav className="policy-links" aria-label="Policies">
      <Link href="/legal/privacy">Privacy</Link>
      <Link href="/legal/terms">Terms</Link>
      <Link href="/legal/cookies">Cookies and storage</Link>
      <Link href="/legal/refunds">Refunds</Link>
      <Link href="/offline">Offline and installation</Link>
    </nav>
  );
}

export function FormPrivacyNotice() {
  return (
    <p className="form-privacy">
      Use synthetic data for this development version. Provide only details needed for this task;
      leave optional fields blank when unnecessary. Do not enter identity documents or sensitive
      personal information. Read the <Link href="/legal/privacy">privacy notice</Link>.
    </p>
  );
}
