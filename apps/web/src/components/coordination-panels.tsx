"use client";

import {
  createApi,
  money,
  type ProviderJob,
  type ProviderPortal,
  type Session,
  type TenantMessage,
} from "@jojobuilds/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import type { WorkspaceContext } from "./workspace";
import { useData } from "./workspace-panels";
import { Badge, Empty, ErrorBox, Field, Loading } from "./ui";
import { MessagingPanel } from "./messaging-panel";
import { ServiceWorkPanel } from "./service-work-panel";

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
  return (
    <div>
      <button
        className="button secondary wide"
        type="button"
        disabled={busy || !status.data?.enabled}
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

export function CoordinationPanel({
  ctx,
  balancesOnly = false,
}: {
  ctx: WorkspaceContext;
  balancesOnly?: boolean;
}) {
  const canSend = ["owner", "manager"].includes(ctx.org.role);
  const balances = useData(ctx, "tenant-balances", canSend);
  const messages = useData(ctx, "tenant-messages", !balancesOnly);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await ctx.api.post<TenantMessage>("/tenant-messages", {
        tenancy_id: data.get("tenancy_id"),
        subject: data.get("subject"),
        body: data.get("body"),
        deliver_email: data.has("deliver_email"),
        idempotency_key: key,
      });
      setNotice(
        `Message saved. In-app: ${result.in_app ? "available" : "tenant not linked"}. Email: ${result.email_status.replaceAll("_", " ")}.`,
      );
      setKey(crypto.randomUUID());
      form.reset();
      await ctx.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Message could not be sent.");
    } finally {
      setBusy(false);
    }
  }
  const problem = balances.error || messages.error;
  if (problem) return <ErrorBox message={problem.message} retry={() => void ctx.refresh()} />;
  if ((canSend && !balances.data) || (!balancesOnly && !messages.data)) return <Loading />;
  if (balancesOnly)
    return (
      <>
        <p className="muted">
          Read-only outstanding balances for your assigned rentals. Payments, deposits, agreements
          and owner finances are not available to managers.
        </p>
        <div className="maintenance-grid">
          {balances.data?.map((row) => (
            <article className="surface maintenance-card" key={row.id}>
              <h2>{row.tenant_name}</h2>
              <p>
                {row.property_name} / Unit {row.unit}
              </p>
              <p className="muted">
                {row.email} · {row.phone} · {row.reference}
              </p>
              <p>
                Outstanding: <strong>{money(row.balance, ctx.org.currency)}</strong>
              </p>
              <p>Overdue: {money(row.overdue, ctx.org.currency)}</p>
              <button className="button secondary" onClick={() => ctx.navigate("messages")}>
                Send a message
              </button>
            </article>
          ))}
        </div>
        {!balances.data?.length && (
          <Empty title="No assigned rentals">Ask the owner to assign your properties.</Empty>
        )}
      </>
    );
  return (
    <>
      {canSend && (
        <form
          className="surface maintenance-card"
          onSubmit={submit}
          onChange={() => setKey(crypto.randomUUID())}
        >
          <h2>Message a tenant</h2>
          <Field label="Rental">
            <select name="tenancy_id" required defaultValue="">
              <option value="" disabled>
                Choose tenant and unit
              </option>
              {balances.data?.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.tenant_name} / {row.property_name} / {row.unit}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subject">
            <input name="subject" required maxLength={150} />
          </Field>
          <Field label="Message">
            <textarea name="body" required maxLength={2000} rows={4} />
          </Field>
          <label>
            <input type="checkbox" name="deliver_email" defaultChecked /> Also queue email when
            configured
          </label>
          <p className="muted">
            In-app messages are available to linked tenant accounts. Queued email is not a delivery
            confirmation.
          </p>
          {error && <ErrorBox message={error} />}
          {notice && (
            <p role="status" className="success-box">
              {notice}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "Sending..." : "Send tenant message"}
          </button>
        </form>
      )}
      <div className="maintenance-grid">
        {messages.data?.map((row) => (
          <article className="surface maintenance-card" key={row.id}>
            <h2>{row.subject}</h2>
            <p className="muted">
              {row.property_name} / {row.unit} · {row.sender} ·{" "}
              {new Date(row.created_at).toLocaleString()}
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{row.body}</p>
            {canSend && (
              <small>
                In-app: {row.in_app ? "available" : "not linked"} · Email:{" "}
                {row.email_status.replaceAll("_", " ")}
              </small>
            )}
          </article>
        ))}
      </div>
      {!messages.data?.length && (
        <Empty title="No messages yet">Tenant messages will appear here.</Empty>
      )}
    </>
  );
}

function ProviderJobCard({
  job,
  api,
  refresh,
}: {
  job: ProviderJob;
  api: ReturnType<typeof createApi>;
  refresh: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const result = await api.post<{ ok: boolean }>(`/provider-portal/requests/${job.id}`, {
        action: data.get("action"),
        status: data.get("action") === "progress" ? data.get("status") : null,
        note: data.get("note"),
        idempotency_key: key,
      });
      if (result.ok) {
        setKey(crypto.randomUUID());
        form.reset();
        await refresh();
      }
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Job update failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="surface maintenance-card">
      <div className="split">
        <Badge>{job.status.replaceAll("_", " ")}</Badge>
        <Badge>{job.response}</Badge>
      </div>
      <h2>{job.title}</h2>
      <p>
        {job.property_name}
        {job.unit ? ` / Unit ${job.unit}` : " / Common area"}
      </p>
      <p className="muted">
        {job.location} · {job.category} · {job.priority}
      </p>
      <p>{job.description}</p>
      <p>Property contact: {job.contact || "Contact your landlord"}</p>
      {job.tenant_name && (
        <p>
          Tenant contact: {job.tenant_name} · {job.tenant_phone || "No phone provided"}
        </p>
      )}
      {job.provider_note && <p className="muted">Your private response: {job.provider_note}</p>}
      <ServiceWorkPanel api={api} requestId={job.id} provider />
      <details className="request-history">
        <summary>Job history</summary>
        {job.updates.map((update, index) => (
          <p key={index}>
            <strong>{update.actor}</strong> · {update.status}
            <br />
            {update.note}
          </p>
        ))}
      </details>
      {!["resolved", "closed"].includes(job.status) && job.response !== "declined" && (
        <form onSubmit={submit} onChange={() => setKey(crypto.randomUUID())}>
          <Field label="Action">
            <select name="action">
              {job.response === "pending" ? (
                <>
                  <option value="accept">Accept assignment</option>
                  <option value="decline">Decline assignment</option>
                </>
              ) : (
                <option value="progress">Update progress / add note</option>
              )}
            </select>
          </Field>
          {job.response === "accepted" && (
            <Field label="Progress">
              <select
                name="status"
                defaultValue={
                  ["awaiting_parts", "in_progress"].includes(job.status)
                    ? job.status
                    : "in_progress"
                }
              >
                <option value="in_progress">In progress</option>
                {["in_progress", "awaiting_parts"].includes(job.status) && (
                  <>
                    <option value="awaiting_parts">Awaiting parts</option>
                    <option value="resolved">Resolved</option>
                  </>
                )}
              </select>
            </Field>
          )}
          <Field
            label={
              job.response === "pending"
                ? "Response note (private to management)"
                : "Progress note (visible to tenant)"
            }
          >
            <textarea name="note" minLength={3} maxLength={500} required />
          </Field>
          {error && <ErrorBox message={error} />}
          <button className="button primary" disabled={busy}>
            {busy ? "Saving..." : "Save job update"}
          </button>
        </form>
      )}
    </article>
  );
}

export function ProviderWorkspace({
  session,
  onWorkspace,
}: {
  session: Session;
  onWorkspace?: () => void;
}) {
  const client = useQueryClient();
  const api = useMemo(
    () => createApi({ baseUrl: "/api/v1", headers: () => ({ "X-CSRF-Token": session.csrf }) }),
    [session.csrf],
  );
  const portal = useQuery({
    queryKey: ["provider-portal", session.user_id],
    queryFn: () => api.request<ProviderPortal>("/provider-portal"),
  });
  const [landlord, setLandlord] = useState("");
  const [tab, setTab] = useState<"jobs" | "messages" | "pending" | "paid" | "voided">("jobs");
  const [error, setError] = useState("");
  const refresh = async () => {
    await portal.refetch();
  };
  return (
    <main className="workspace-main" style={{ maxWidth: 1200, margin: "auto", padding: 24 }}>
      <header className="toolbar">
        <div>
          <div className="wordmark">
            JOJO<span>BUILDS</span>
          </div>
          <h1>My service work</h1>
          <p className="muted">
            {session.name} · {session.email}
          </p>
        </div>
        {onWorkspace && (
          <button className="button secondary" onClick={onWorkspace}>
            Property workspace
          </button>
        )}
        <button
          className="button secondary"
          onClick={async () => {
            try {
              await api.post("/auth/logout", {});
              client.clear();
              window.location.reload();
            } catch (problem) {
              setError(problem instanceof Error ? problem.message : "Sign out failed.");
            }
          }}
        >
          Sign out
        </button>
      </header>
      {error && <ErrorBox message={error} />}
      <GoogleButton api={api} connect />
      {portal.error ? (
        <ErrorBox message={portal.error.message} retry={() => void portal.refetch()} />
      ) : !portal.data ? (
        <Loading />
      ) : (
        <>
          <div className="filter-chips" aria-label="Provider views">
            {(["jobs", "messages", "pending", "paid", "voided"] as const).map((value) => (
              <button
                key={value}
                className={tab === value ? "selected" : ""}
                onClick={() => setTab(value)}
              >
                {
                  {
                    jobs: "Jobs",
                    messages: "Messages",
                    pending: "Services pending",
                    paid: "Services paid",
                    voided: "Voided services",
                  }[value]
                }
              </button>
            ))}
          </div>
          <Field label="Landlord">
            <select value={landlord} onChange={(event) => setLandlord(event.target.value)}>
              <option value="">All landlords</option>
              {portal.data.landlords.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} / {row.landlord}
                  {row.demo ? " (synthetic demo)" : ""}
                </option>
              ))}
            </select>
          </Field>
          {!portal.data.landlords.length && (
            <Empty title="No active service relationships">
              Ask the landlord for a provider invitation. Revoked relationships are no longer
              accessible.
            </Empty>
          )}
          {portal.data.landlords
            .filter((row) => !landlord || landlord === row.id)
            .map((row) => (
              <section key={row.id}>
                <h2>
                  {row.name} · {row.landlord}
                </h2>
                {row.demo && <Badge>Synthetic demo</Badge>}
                {tab === "messages" && <MessagingPanel api={api} orgId={row.id} />}
                {tab === "jobs" && !portal.data.requests.some((job) => job.org_id === row.id) && (
                  <p className="muted">No assigned requests yet.</p>
                )}
                {tab === "jobs" && (
                  <div className="maintenance-grid">
                    {portal.data.requests
                      .filter((job) => job.org_id === row.id)
                      .map((job) => (
                        <ProviderJobCard key={job.id} job={job} api={api} refresh={refresh} />
                      ))}
                  </div>
                )}
                {["pending", "paid", "voided"].includes(tab) && (
                  <>
                    <p className="muted">
                      Only your approved service bills and recorded payments. Quotations awaiting
                      approval are under Jobs. Approval does not transfer money.
                    </p>
                    <div className="maintenance-grid">
                      {portal.data.services
                        .filter(
                          (service) =>
                            service.org_id === row.id &&
                            (tab === "pending"
                              ? ["awaiting_payment", "partially_paid"].includes(service.status)
                              : service.status === tab),
                        )
                        .map((service) => (
                          <article className="surface maintenance-card" key={service.id}>
                            <h3>{service.description}</h3>
                            <p>{service.property_name}</p>
                            <Badge>{service.status.replaceAll("_", " ")}</Badge>
                            <p>Billed: {money(service.amount, service.currency)}</p>
                            <p>
                              Paid: {money(service.paid, service.currency)} / Remaining:{" "}
                              {money(service.balance, service.currency)}
                            </p>
                            <p>
                              Due: {service.due_date} / Invoice:{" "}
                              {service.invoice_status || "not submitted"}
                            </p>
                            {service.reference && <p>Reference: {service.reference}</p>}
                            <details>
                              <summary>Payment history</summary>
                              {!service.payments.length && <p>No payments recorded yet.</p>}
                              {service.payments.map((payment) => (
                                <p key={payment.id}>
                                  {payment.paid_on} / {money(payment.amount, service.currency)} /{" "}
                                  {payment.method} / {payment.reference || "No reference"}
                                  {payment.reversed_at && ` / Reversed: ${payment.reversal_reason}`}
                                </p>
                              ))}
                            </details>
                          </article>
                        ))}
                    </div>
                    {!portal.data.services.some(
                      (service) =>
                        service.org_id === row.id &&
                        (tab === "pending"
                          ? ["awaiting_payment", "partially_paid"].includes(service.status)
                          : service.status === tab),
                    ) && (
                      <Empty title="No services in this view">
                        Approved bills and actual recorded payments will appear here.
                      </Empty>
                    )}
                  </>
                )}
              </section>
            ))}
        </>
      )}
    </main>
  );
}
