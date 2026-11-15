"use client";

import Link from "next/link";
import { money } from "@jojobuilds/api-client";
import { useEffect, useState, type FormEvent } from "react";
import {
  clearSummary,
  decryptSummary,
  encryptSummary,
  readSummary,
  snapshotKey,
  type OfflineSummary,
} from "@/lib/offline";
import { ErrorBox, Field } from "./ui";

export function OfflineScreen() {
  const [summary, setSummary] = useState<OfflineSummary | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const update = () => {
      try {
        setSummary(readSummary());
      } catch {
        setError("Browser storage is unavailable. Use the online workspace.");
      }
    };
    update();
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("storage", update);
    window.addEventListener("jojobuilds-summary-cleared", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", update);
      window.removeEventListener("jojobuilds-summary-cleared", update);
    };
  }, []);

  async function backup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const passphrase = String(data.get("passphrase"));
      const file = data.get("backup");
      if (file instanceof File && file.size) {
        if (file.size > 20_000) throw new Error("Summary file is too large.");
        if (!data.has("confirm-restore"))
          throw new Error("Confirm saving the restored totals on this device.");
        const restored = await decryptSummary(await file.text(), passphrase);
        localStorage.setItem(snapshotKey, JSON.stringify(restored));
        setSummary(restored);
        setNotice("Read-only summary restored. No server records were changed.");
      } else {
        const fresh = readSummary();
        if (!fresh) throw new Error("Save a fresh summary online before downloading a backup.");
        const encrypted = await encryptSummary(fresh, passphrase);
        const url = URL.createObjectURL(new Blob([encrypted], { type: "application/json" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "jojobuilds-summary.encrypted.json";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice(
          "Encrypted summary downloaded. Keep your passphrase separately; this is not a ledger backup.",
        );
      }
      form.reset();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Backup failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main-content" className="legal-page offline-page">
      <button
        className="button primary"
        onClick={() => window.location.assign(new URL("/", window.location.origin).href)}
      >
        Open online workspace
      </button>
      <h1>Read-only offline summary</h1>
      <p>Saved totals only. No rent, payment or other changes can be entered or queued offline.</p>
      <p className="form-privacy">
        Anyone with this browser profile can see saved totals. Only save on your own locked device.
        Summaries expire after 24 hours and are not a full database or file backup.
      </p>
      {summary ? (
        <section aria-label="Saved totals">
          <p role="status">
            {summary.demo ? "Synthetic demo" : "Saved totals"} for {summary.period}. Saved{" "}
            {new Date(summary.savedAt).toLocaleString()}. Not live.
          </p>
          <dl className="offline-totals">
            <div>
              <dt>Billed</dt>
              <dd>{money(summary.billed, summary.currency)}</dd>
            </div>
            <div>
              <dt>Allocated</dt>
              <dd>{money(summary.allocated, summary.currency)}</dd>
            </div>
            <div>
              <dt>Outstanding</dt>
              <dd>{money(summary.outstanding, summary.currency)}</dd>
            </div>
            <div>
              <dt>Overdue</dt>
              <dd>{money(summary.overdue, summary.currency)}</dd>
            </div>
            <div>
              <dt>Units occupied / total</dt>
              <dd>
                {summary.occupied} / {summary.units}
              </dd>
            </div>
          </dl>
        </section>
      ) : (
        <p role="status">
          No current saved summary. Sign in online and choose Save summary in workspace settings.
        </p>
      )}
      <button
        className="button secondary"
        onClick={() => {
          if (clearSummary()) {
            setSummary(null);
            setNotice("Saved summary cleared.");
          } else {
            setError("Could not clear storage. Remove site data in your browser settings.");
          }
        }}
      >
        Clear saved summary
      </button>
      <section>
        <h2>Encrypted summary backup</h2>
        <p>
          This protects a copy of the selected totals, not tenant records, the ledger or uploads. A
          restored summary must still be less than 24 hours old. For full backups use the operator
          database-and-files procedure.
        </p>
        <form onSubmit={backup}>
          <Field label="Backup passphrase (12 to 200 characters)">
            <input
              name="passphrase"
              type="password"
              minLength={12}
              maxLength={200}
              required
              autoComplete="off"
            />
          </Field>
          <Field label="Encrypted summary file (optional; choose only to restore)">
            <input name="backup" type="file" accept=".json,application/json" />
          </Field>
          <label className="choice">
            <input type="checkbox" name="confirm-restore" /> If restoring, save these totals on this
            device, replacing any saved summary.
          </label>
          <button className="button primary" disabled={busy}>
            {busy ? "Working..." : "Download summary backup or restore chosen file"}
          </button>
        </form>
        {error && <ErrorBox message={error} />}
        {notice && <p role="status">{notice}</p>}
      </section>
      <Link href="/legal/cookies">How device storage works</Link>
    </main>
  );
}
