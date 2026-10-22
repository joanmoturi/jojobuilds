"use client";

import {
  canFinance,
  canManage,
  money,
  type OwnerFinances,
  type Payable,
} from "@jojobuilds/api-client";
import { useQuery } from "@tanstack/react-query";
import { Plus, Wallet, Wrench } from "lucide-react";
import { useState } from "react";
import type { WorkspaceContext } from "./workspace";
import { rentalLabel, useData } from "./workspace-panels";
import { Badge, Empty, ErrorBox, Loading, SectionHead } from "./ui";

export function PayableCards({ ctx, records }: { ctx: WorkspaceContext; records: Payable[] }) {
  if (!records.length)
    return (
      <Empty title="No bills recorded">
        Add an obligation, then record payments you have actually made.
      </Empty>
    );
  return (
    <div className="maintenance-grid finance-grid">
      {records.map((bill) => (
        <article className="surface maintenance-card finance-card" key={bill.id}>
          <div className="split">
            <span className="eyebrow">{bill.kind.replaceAll("_", " ")}</span>
            <Badge
              tone={
                bill.voided_at ? "neutral" : bill.overdue ? "red" : bill.balance ? "amber" : "green"
              }
            >
              {bill.voided_at
                ? "Voided"
                : bill.overdue
                  ? "Overdue"
                  : bill.balance
                    ? "Outstanding"
                    : "Paid"}
            </Badge>
          </div>
          <h2>{bill.description}</h2>
          <p className="muted">
            {[bill.provider_name, bill.property_name, bill.reference].filter(Boolean).join(" · ") ||
              "Owner-private entry"}
          </p>
          <p>
            <strong>{money(bill.balance, ctx.org.currency)}</strong> outstanding
          </p>
          <small className="muted">
            Billed {money(bill.amount, ctx.org.currency)} · Paid{" "}
            {money(bill.paid, ctx.org.currency)}
          </small>
          <small className="muted">
            Due {bill.due_date} · Last paid {bill.last_paid_on ?? "Never"}
          </small>
          {bill.maintenance_id && (
            <small className="muted">
              Linked to maintenance job {bill.maintenance_id.slice(0, 8)}
            </small>
          )}
          {bill.void_reason && <p className="muted">Voided: {bill.void_reason}</p>}
          {!bill.voided_at && bill.balance > 0 && (
            <button
              className="button primary"
              onClick={() => ctx.openForm({ kind: "outgoing-payment", id: bill.id })}
            >
              Record outgoing payment
            </button>
          )}
          {!bill.voided_at && bill.paid === 0 && (
            <button
              className="text-button"
              onClick={() => ctx.openForm({ kind: "payable-void", id: bill.id })}
            >
              Void incorrect bill
            </button>
          )}
          <details className="request-history">
            <summary>Payment history ({bill.payments.length})</summary>
            {bill.payments.length === 0 && <p className="muted">No payments recorded.</p>}
            {bill.payments.map((payment) => (
              <div key={payment.id}>
                <p>
                  <strong>
                    {money(payment.amount, ctx.org.currency)} · {payment.paid_on}
                  </strong>
                  <small>
                    {payment.method} · {payment.reference || "No reference"}
                  </small>
                  {payment.reversed_at ? (
                    <small>Reversed: {payment.reversal_reason}</small>
                  ) : (
                    <button
                      className="text-button"
                      onClick={() => ctx.openForm({ kind: "outgoing-reverse", id: payment.id })}
                    >
                      Reverse entry
                    </button>
                  )}
                </p>
              </div>
            ))}
          </details>
        </article>
      ))}
    </div>
  );
}

export function ProvidersPanel({ ctx }: { ctx: WorkspaceContext }) {
  const providers = useData(ctx, "providers");
  const financial = canFinance(ctx.org.role);
  const bills = useData(ctx, "payables", financial);
  const jobs = useData(ctx, "maintenance");
  const [selected, setSelected] = useState("");
  const error = providers.error || bills.error || jobs.error;
  if (error) return <ErrorBox message={error.message} retry={() => void ctx.refresh()} />;
  if (!providers.data || !jobs.data || (financial && !bills.data)) return <Loading />;
  return (
    <>
      <div className="toolbar">
        <p className="muted">Your service directory. Providers do not have login accounts.</p>
        {canManage(ctx.org.role) && (
          <button className="button primary" onClick={() => ctx.openForm("provider")}>
            <Plus size={16} /> Add service provider
          </button>
        )}
      </div>
      {!providers.data.length ? (
        <Empty title="Build your trusted team">
          Add plumbers, electricians, security companies and other service contacts.
        </Empty>
      ) : (
        <div className="maintenance-grid finance-grid">
          {providers.data.map((provider) => (
            <article className="surface maintenance-card finance-card" key={provider.id}>
              <div className="split">
                <span className="metric-icon">
                  <Wrench size={19} />
                </span>
                <Badge tone={provider.active ? "green" : "neutral"}>
                  {provider.active ? provider.trade : "Archived"}
                </Badge>
              </div>
              <h2>{provider.name}</h2>
              <p>{provider.contact_name || "No contact person recorded"}</p>
              <p className="muted">
                {provider.phone || "No phone"}
                <br />
                {provider.email || "No email"}
                <br />
                {provider.address}
              </p>
              {provider.notes && <p className="muted">{provider.notes}</p>}
              {provider.balance !== null && (
                <>
                  <p>
                    <strong>{money(provider.balance, ctx.org.currency)}</strong> owed
                  </p>
                  <small className="muted">
                    Last paid: {provider.last_paid_on ?? "No payments recorded"}
                  </small>
                </>
              )}
              <small className="muted">
                {jobs.data.filter((job) => job.provider_id === provider.id).length} linked
                maintenance jobs
              </small>
              {jobs.data.some((job) => job.provider_id === provider.id) && (
                <details className="request-history">
                  <summary>Assigned maintenance jobs</summary>
                  {jobs.data
                    .filter((job) => job.provider_id === provider.id)
                    .map((job) => (
                      <div key={job.id}>
                        <p>
                          <strong>{job.title}</strong>
                          <small>
                            {job.property_name} ·{" "}
                            {job.tenant_name
                              ? `${job.tenant_name} / Unit ${job.unit}`
                              : "Common area"}{" "}
                            · {job.status.replaceAll("_", " ")}
                          </small>
                        </p>
                      </div>
                    ))}
                </details>
              )}
              {canManage(ctx.org.role) && (
                <button
                  className="button secondary"
                  onClick={() => ctx.openForm({ kind: "provider-edit", id: provider.id })}
                >
                  Contact details / edit
                </button>
              )}
              {financial && provider.active && (
                <button
                  className="button primary"
                  onClick={() => ctx.openForm({ kind: "provider-bill", id: provider.id })}
                >
                  Add provider bill
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      {financial && (
        <>
          <section className="surface">
            <SectionHead title="Service bills & payment history" label="WHAT YOU OWE" />
            <div className="finance-intro">
              <label className="field">
                <span>Filter service provider</span>
                <select value={selected} onChange={(event) => setSelected(event.target.value)}>
                  <option value="">All service providers</option>
                  {providers.data.map((provider) => (
                    <option value={provider.id} key={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="muted">
                Balances include authorized properties only. A maintenance estimate is not a
                payment. These records do not transfer money.
              </p>
            </div>
          </section>
          <PayableCards
            ctx={ctx}
            records={
              bills.data?.filter(
                (bill) => bill.kind === "service" && (!selected || bill.provider_id === selected),
              ) ?? []
            }
          />
        </>
      )}
    </>
  );
}

export function RecurringChargesPanel({ ctx }: { ctx: WorkspaceContext }) {
  const tenantView = ctx.org.role === "tenant";
  const rentals = useData(ctx, "rentals", tenantView);
  const rules = useData(ctx, "recurring-charges");
  const tenancies = useData(ctx, "tenancies");
  const tenants = useData(ctx, "tenants");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const queryError = rules.error || tenancies.error || tenants.error || rentals.error;
  if (queryError) return <ErrorBox message={queryError.message} retry={() => void ctx.refresh()} />;
  if (!rules.data || !tenancies.data || !tenants.data || (tenantView && !rentals.data))
    return <Loading />;
  return (
    <>
      <div className="toolbar">
        <p className="muted">
          Fixed monthly water, garbage and service charges. Variable bills appear with rent in
          Payments.
        </p>
        {canFinance(ctx.org.role) && (
          <div className="heading-actions">
            <button className="button secondary" onClick={() => ctx.openForm("charge")}>
              Add variable bill
            </button>
            <button className="button primary" onClick={() => ctx.openForm("recurring-charge")}>
              <Plus size={16} /> Set recurring charge
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                setNotice("");
                try {
                  const result = await ctx.api.post<{
                    created: number;
                    skipped_partial_periods: number;
                  }>("/billing/generate", { period: ctx.period });
                  await ctx.refresh();
                  setNotice(
                    `${result.created} new charges generated for ${ctx.period}. ${result.skipped_partial_periods} partial-period tenancies skipped.`,
                  );
                } catch (problem) {
                  setError(
                    problem instanceof Error ? problem.message : "Could not generate bills.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Generating..." : "Generate rent & bills"}
            </button>
          </div>
        )}
      </div>
      {error && <ErrorBox message={error} />}
      {notice && (
        <p role="status" className="info-strip">
          {notice}
        </p>
      )}
      <p className="muted">
        One charge per type, tenancy and month. Changing a rule never changes an existing bill. Do
        not create both a fixed and a variable bill of the same type for the same month.
      </p>
      {!rules.data.length ? (
        <Empty title="No recurring extra charges">
          Water and garbage can also be recorded manually when the amount varies.
        </Empty>
      ) : (
        <div className="maintenance-grid finance-grid">
          {rules.data.map((rule) => {
            const lease = tenancies.data.find((lease) => lease.id === rule.tenancy_id);
            const tenant = tenants.data.find((tenant) => tenant.id === lease?.tenant_id);
            const rental = rentals.data?.find((r) => r.id === rule.tenancy_id);
            return (
              <article className="surface maintenance-card finance-card" key={rule.id}>
                <div className="split">
                  <span className="eyebrow">{rule.kind}</span>
                  <Badge tone={rule.active ? "green" : "neutral"}>
                    {rule.active ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <h2>{rule.description}</h2>
                <p>
                  {tenantView && rental ? rentalLabel(rental) : (tenant?.name ?? lease?.reference)}
                </p>
                <p>
                  <strong>{money(rule.amount, ctx.org.currency)}</strong> / month
                </p>
                <p className="muted">
                  Due day {rule.due_day} · {rule.start_period} to {rule.end_period ?? "ongoing"}
                </p>
                {canFinance(ctx.org.role) && (
                  <button
                    className="button secondary"
                    onClick={() => ctx.openForm({ kind: "recurring-edit", id: rule.id })}
                  >
                    Edit / disable rule
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

export function OwnerFinancesPanel({ ctx }: { ctx: WorkspaceContext }) {
  const summary = useQuery({
    queryKey: [ctx.org.id, "owner-finances", ctx.period],
    queryFn: () =>
      ctx.api.request<OwnerFinances>(`/owner-finances?period=${encodeURIComponent(ctx.period)}`),
    enabled: ctx.org.role === "owner",
  });
  const bills = useData(ctx, "payables", ctx.org.role === "owner");
  if (ctx.org.role !== "owner")
    return <ErrorBox message="Owner finances are private to the owner." />;
  const error = summary.error || bills.error;
  if (error) return <ErrorBox message={error.message} retry={() => void ctx.refresh()} />;
  if (!summary.data || !bills.data) return <Loading />;
  const metrics = [
    ["Recorded inflows (excludes deposits)", summary.data.inflows],
    ["Service providers paid", summary.data.service_paid],
    ["Property operating costs paid", summary.data.operating_paid],
    ["Taxes paid (manual)", summary.data.tax_paid],
    ["Loan repayments made", summary.data.loan_paid],
    ["Personal / owner use paid", summary.data.owner_use_paid],
    ["Net recorded cash movement", summary.data.net_movement],
    ["Outstanding bills (all dates)", summary.data.outstanding],
    ["Overdue bills (all dates)", summary.data.overdue],
  ] as const;
  return (
    <>
      <div className="toolbar">
        <p className="muted">
          Owner dashboard only. Tax, loan and personal-use entries are private; property operating
          costs are shared with authorized finance staff.
        </p>
        <button className="button primary" onClick={() => ctx.openForm("owner-obligation")}>
          <Plus size={16} /> Add obligation / owner use
        </button>
      </div>
      <div className="maintenance-grid finance-grid">
        {metrics.map(([label, amount]) => (
          <article className="surface maintenance-card finance-card" key={label}>
            <span className="metric-icon">
              <Wallet size={18} />
            </span>
            <small className="muted">{label}</small>
            <h2>{money(amount, ctx.org.currency)}</h2>
          </article>
        ))}
      </div>
      <section className="surface">
        <SectionHead
          title="Taxes, loan repayments & personal spending"
          label={`RECORDED MOVEMENT · ${ctx.period}`}
        />
        <p className="muted finance-intro">
          Record the amount and due date, then record each payment actually made. Tax amounts and
          loan instalments are manual, not calculated or filed. Personal spending is one owner-use
          outflow: do not record a withdrawal and its subsequent spending twice. Net movement is not
          a bank balance or accounting profit; it excludes opening balances, deposits and unrecorded
          transactions.
        </p>
      </section>
      <PayableCards ctx={ctx} records={bills.data.filter((bill) => bill.kind !== "service")} />
    </>
  );
}
