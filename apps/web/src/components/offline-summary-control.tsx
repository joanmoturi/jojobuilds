"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { makeSummary, snapshotKey } from "@/lib/offline";
import type { WorkspaceContext } from "./workspace";
import { ErrorBox } from "./ui";

export function OfflineSummaryControl({ ctx }: { ctx: WorkspaceContext }) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  if (!["owner", "finance", "tenant"].includes(ctx.org.role)) return null;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const summary = makeSummary(await ctx.api.dashboard(ctx.period));
      if (!active.current) return;
      localStorage.setItem(snapshotKey, JSON.stringify(summary));
      setNotice(
        "Selected totals saved for up to 24 hours. No contacts, individual records or credentials were saved.",
      );
      form.reset();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Summary could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="surface offline-control">
      <h2>Offline summary and backup</h2>
      <p>
        Save only selected totals for {ctx.period}. Offline edits and payment syncing are not
        supported. This replaces any previous summary on this browser.
      </p>
      <form onSubmit={save}>
        <label className="choice">
          <input type="checkbox" required /> Save totals on this device. I understand anyone using
          this browser profile can read them; I will not use a shared device.
        </label>
        <button className="button secondary" disabled={busy}>
          {busy ? "Saving summary..." : "Save summary"}
        </button>
      </form>
      <Link className="inline-link" href="/offline">
        View, clear or back up saved summary
      </Link>
      {error && <ErrorBox message={error} />}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
