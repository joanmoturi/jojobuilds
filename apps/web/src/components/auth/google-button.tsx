"use client";

import type { createApi } from "@jojobuilds/api-client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ErrorBox } from "../ui";

export function GoogleButton({
  api,
  invitation,
  connect = false,
}: {
  api: ReturnType<typeof createApi>;
  invitation?: string;
  connect?: boolean;
}) {
  const status = useQuery({
    queryKey: ["google-status"],
    queryFn: () => api.request<{ enabled: boolean }>("/auth/google/status"),
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  return (
    <div>
      <p className="form-privacy">
        Optional: continuing takes you to Google to share your basic identity. Password sign-in
        remains available. Read our <Link href="/legal/privacy">privacy notice</Link> before
        continuing.
      </p>
      {invitation && !connect && (
        <label className="choice">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
          />{" "}
          For this invitation, I accept the <Link href="/legal/terms">terms</Link> and have read the{" "}
          <Link href="/legal/privacy">privacy notice</Link>. This is not marketing consent.
        </label>
      )}
      <button
        className="button secondary wide"
        type="button"
        disabled={busy || !status.data?.enabled || Boolean(invitation && !connect && !accepted)}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const result = await api.post<{ url: string }>(
              `/auth/google/${connect ? "link" : "start"}`,
              { invitation: invitation || null },
            );
            window.location.assign(result.url);
          } catch (problem) {
            setError(problem instanceof Error ? problem.message : "Google sign-in failed.");
            setBusy(false);
          }
        }}
      >
        {connect ? "Connect Google account" : "Continue with Google"}
      </button>
      {status.error ? (
        <ErrorBox message={status.error.message} retry={() => void status.refetch()} />
      ) : status.data && !status.data.enabled ? (
        <p className="muted">Google sign-in is not configured. Use email and password.</p>
      ) : null}
      {connect && (
        <p className="muted">
          Connect your matching Google email while signed in before using Google on an existing
          account.
        </p>
      )}
      {error && <ErrorBox message={error} />}
    </div>
  );
}
