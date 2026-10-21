"use client";

import {
  canFinance,
  canMaintain,
  canManage,
  canManageTenants,
  money,
  type Maintenance,
  type Queries,
} from "@jojobuilds/api-client";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  CheckCheck,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FileSpreadsheet,
  Home,
  Mail,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import type { WorkspaceContext } from "./workspace";
import { Badge, Empty, ErrorBox, Loading, SectionHead } from "./ui";

export type FormKind =
  | "property"
  | "unit"
  | "tenant"
  | "tenancy"
  | "payment"
  | "charge"
  | "import"
  | "invite"
  | "maintenance"
  | {
      kind:
        | "maintenance-update"
        | "reverse"
        | "tenant-detail"
        | "property-edit"
        | "end-tenancy"
        | "receipt";
      id: string;
    };

export function useData<K extends keyof Queries>(
  ctx: WorkspaceContext,
  resource: K,
  enabled = true,
) {
  return useQuery({
    queryKey: [ctx.org.id, resource],
    queryFn: () => ctx.api.get(resource),
    enabled,
  });
}

export function Overview({ ctx }: { ctx: WorkspaceContext }) {
  const summary = useQuery({
    queryKey: [ctx.org.id, "dashboard", ctx.period],
    queryFn: () => ctx.api.dashboard(ctx.period),
  });
  const properties = useData(ctx, "properties");
  const payments = useData(ctx, "payments");
  const charges = useData(ctx, "charges");
  const tenants = useData(ctx, "tenants");
  const tenancies = useData(ctx, "tenancies");
  const firstError = [
    summary.error,
    properties.error,
    payments.error,
    charges.error,
    tenants.error,
    tenancies.error,
  ].find(Boolean);
  if (firstError) return <ErrorBox message={firstError.message} retry={() => void ctx.refresh()} />;
  if (
    !summary.data ||
    !properties.data ||
    !payments.data ||
    !charges.data ||
    !tenants.data ||
    !tenancies.data
  )
    return <Loading />;
  const s = summary.data;
  const collection = s.billed ? Math.round((s.allocated / s.billed) * 100) : 0;
  const occupancy = s.units ? Math.round((s.occupied / s.units) * 100) : 0;
  const tenant = ctx.org.role === "tenant";
  const arrears = tenancies.data
    .map((t) => ({
      tenancy: t,
      tenant: tenants.data.find((person) => person.id === t.tenant_id),
      balance: charges.data
        .filter((c) => c.tenancy_id === t.id && c.overdue && c.kind !== "deposit")
        .reduce((sum, c) => sum + c.balance, 0),
    }))
    .filter((row) => row.balance > 0);
  const showImportReminder = s.statement_refresh_due;
  return (
    <>
      <div className="overview-grid">
        <section className="collection-card">
          <div className="collection-top">
            <span className="eyebrow">
              {ctx.period} · {tenant ? "YOUR RENT ACCOUNT" : "RENT COLLECTION"}
            </span>
            <Badge tone={collection >= 90 ? "green" : "amber"}>{collection}% allocated</Badge>
          </div>
          <span className="metric-label">Rent received & allocated</span>
          <div className="hero-amount">
            {money(s.allocated, s.currency)}
            <span>of {money(s.billed, s.currency)} billed</span>
          </div>
          <div className="progress">
            <span style={{ width: `${Math.min(collection, 100)}%` }} />
          </div>
          <div className="collection-bottom">
            <span>
              <i className="dot green" /> Confirmed allocations
            </span>
            <span>
              Period balance <strong>{money(s.billed - s.allocated, s.currency)}</strong>
            </span>
          </div>
        </section>
        <section className="metric-card">
          <span className="metric-icon">
            <Home size={21} />
          </span>
          <span className="metric-label">{tenant ? "My tenancies" : "Portfolio occupancy"}</span>
          <strong>{tenant ? s.occupied : `${occupancy}%`}</strong>
          <p>
            {s.occupied} occupied <span>of {s.units} units</span>
          </p>
          <div className="mini-progress">
            <span style={{ width: `${occupancy}%` }} />
          </div>
        </section>
        <section className="metric-card">
          <span className="metric-icon amber">
            <Clock3 size={21} />
          </span>
          <span className="metric-label">Needs a closer look</span>
          <strong>
            {tenant ? money(s.overdue, s.currency) : s.pending_review.toString().padStart(2, "0")}
          </strong>
          <p>{tenant ? "Overdue rent and bills" : "Payments awaiting review"}</p>
          <button className="inline-link" onClick={() => ctx.navigate("payments")}>
            {tenant ? "View my account" : "Review transactions"} <ArrowUpRight size={15} />
          </button>
        </section>
      </div>
      {!tenant && (
        <button
          className={`reconcile-banner ${showImportReminder ? "" : "fresh"}`}
          onClick={() => ctx.openForm("import")}
        >
          <span className="banner-icon">
            <FileSpreadsheet size={23} />
          </span>
          <span>
            <strong>
              {showImportReminder
                ? "Time for a fresh statement?"
                : "Your reconciliation workspace is ready."}
            </strong>
            <small>
              {s.last_import
                ? `Last imported ${new Date(s.last_import).toLocaleDateString("en-KE")}. Imports are reviewed, never automatically bank-verified.`
                : "Import a bank statement, then review and confirm each payment."}
            </small>
          </span>
          <span className="banner-action">
            Import statement <ArrowRight size={16} />
          </span>
        </button>
      )}
      <div className="two-columns">
        <section className="surface">
          <SectionHead
            title={tenant ? "My property" : "Your properties"}
            label="THE BIG PICTURE"
            action={
              <button className="inline-link" onClick={() => ctx.navigate("properties")}>
                View all <ArrowRight size={14} />
              </button>
            }
          />
          {!properties.data.length ? (
            <Empty title="Room for your first property">
              Add your property, then units and tenancies.
            </Empty>
          ) : (
            properties.data.slice(0, 4).map((p, index) => (
              <div className="property-row" key={p.id}>
                <div className={`property-thumb thumb-${index % 3}`}>
                  <Building2 size={28} />
                </div>
                <div className="row-grow">
                  <strong>{p.name}</strong>
                  <span>
                    <MapPin size={11} /> {p.location}
                  </span>
                  <small>
                    {p.occupied} occupied · {p.units} units
                  </small>
                </div>
                <div className="row-end">
                  {p.outstanding !== null && (
                    <>
                      <Badge tone={p.outstanding ? "amber" : "green"}>
                        {p.outstanding ? "Balance due" : "Up to date"}
                      </Badge>
                      <strong>{money(p.collected ?? 0, s.currency)}</strong>
                    </>
                  )}
                  <ChevronRight size={14} />
                </div>
              </div>
            ))
          )}
        </section>
        <section className="surface">
          <SectionHead
            title="A little attention needed"
            label="ARREARS AT A GLANCE"
            action={<Badge tone="red">{arrears.length} accounts</Badge>}
          />
          {!arrears.length ? (
            <Empty title="All clear here">No overdue charges in the records you can access.</Empty>
          ) : (
            arrears.slice(0, 4).map((row) => (
              <div className="arrears-row" key={row.tenancy.id}>
                <span className="avatar warm">{row.tenant?.name.slice(0, 2).toUpperCase()}</span>
                <div className="row-grow">
                  <strong>{row.tenant?.name ?? row.tenancy.reference}</strong>
                  <small>{row.tenancy.reference}</small>
                </div>
                <div className="row-end">
                  <strong className="red-text">{money(row.balance, s.currency)}</strong>
                  <small>Overdue balance</small>
                </div>
              </div>
            ))
          )}
          {canFinance(ctx.org.role) && (
            <button className="panel-footer-link" onClick={() => ctx.navigate("tenants")}>
              See tenant accounts <ArrowRight size={14} />
            </button>
          )}
        </section>
      </div>
      <section className="surface">
        <SectionHead
          title="Recent payment activity"
          label="THE LATEST"
          action={
            <button className="inline-link" onClick={() => ctx.navigate("payments")}>
              Full ledger <ArrowRight size={14} />
            </button>
          }
        />
        <PaymentTable ctx={ctx} payments={payments.data.slice(0, 5)} />
      </section>
      <div className="quiet-stats">
        <span>
          <CircleDollarSign size={16} /> Cash received in period{" "}
          <strong>{money(s.cash_received, s.currency)}</strong>
        </span>
        <span>
          Unallocated credit <strong>{money(s.unallocated_credit, s.currency)}</strong>
        </span>
        <span>
          <Wrench size={15} /> {s.maintenance_open} open maintenance requests
        </span>
      </div>
    </>
  );
}

export function PropertiesPanel({ ctx }: { ctx: WorkspaceContext }) {
  const properties = useData(ctx, "properties");
  const units = useData(ctx, "units");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  if (properties.error || units.error)
    return (
      <ErrorBox
        message={(properties.error ?? units.error)!.message}
        retry={() => void ctx.refresh()}
      />
    );
  if (!properties.data || !units.data) return <Loading />;
  const filtered = properties.data.filter((p) =>
    `${p.name} ${p.location}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            placeholder="Search by property, location..."
            aria-label="Search properties"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="toolbar-actions">
          {canManage(ctx.org.role) && (
            <>
              <button className="button secondary" onClick={() => ctx.openForm("unit")}>
                <Plus size={16} /> Add unit
              </button>
              {ctx.org.role === "owner" && (
                <button className="button primary" onClick={() => ctx.openForm("property")}>
                  <Plus size={16} /> Add property
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {!filtered.length ? (
        <Empty title={search ? "No matching properties" : "Your portfolio starts here"}>
          Add a property to begin organizing units and rent.
        </Empty>
      ) : (
        <div className="property-grid">
          {filtered.map((p, index) => (
            <article className="property-card" key={p.id}>
              <div className={`property-art art-${index % 3}`} aria-hidden="true">
                <div className="building-shape">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <span className="art-label">{p.county || "YOUR PROPERTY"}</span>
                <Building2 className="art-icon" size={22} />
              </div>
              <div className="property-card-body">
                <div className="split">
                  <Badge tone={p.units && p.units === p.occupied ? "green" : "amber"}>
                    {p.occupied}/{p.units} occupied
                  </Badge>
                  {canManage(ctx.org.role) && (
                    <button
                      className="icon-btn"
                      aria-label={`Edit ${p.name}`}
                      onClick={() => ctx.openForm({ kind: "property-edit", id: p.id })}
                    >
                      <MoreHorizontal size={19} />
                    </button>
                  )}
                </div>
                <h2>{p.name}</h2>
                <p className="location">
                  <MapPin size={13} />
                  {p.location}
                </p>
                <div className="property-meta">
                  <span>Residential portfolio</span>
                  <span>{p.units} units</span>
                </div>
                {p.billed !== null && (
                  <div className="property-finance">
                    <div>
                      <small>Allocated to charges · all time</small>
                      <strong>{money(p.collected ?? 0, ctx.org.currency)}</strong>
                    </div>
                    <div>
                      <small>Outstanding</small>
                      <strong className={p.outstanding ? "red-text" : "green-text"}>
                        {money(p.outstanding ?? 0, ctx.org.currency)}
                      </strong>
                    </div>
                  </div>
                )}
                <div className="occupancy-line">
                  <span style={{ width: `${p.units ? (p.occupied / p.units) * 100 : 0}%` }} />
                </div>
                <button
                  className="button secondary wide"
                  onClick={() => setSelected(selected === p.id ? "" : p.id)}
                >
                  {selected === p.id ? "Hide units" : "View units"} <ArrowUpRight size={15} />
                </button>
                {selected === p.id && (
                  <div className="unit-list">
                    {units.data
                      .filter((u) => u.property_id === p.id)
                      .map((u) => (
                        <div key={u.id}>
                          <span>
                            {u.building} · {u.number}
                          </span>
                          <Badge tone={u.occupied ? "green" : "neutral"}>
                            {u.occupied ? "Occupied" : "Vacant"}
                          </Badge>
                        </div>
                      ))}
                    {p.contact && <p className="muted">Property contact: {p.contact}</p>}
                  </div>
                )}
              </div>
            </article>
          ))}
          {ctx.org.role === "owner" && (
            <button className="add-property-card" onClick={() => ctx.openForm("property")}>
              <span>
                <Plus size={25} />
              </span>
              <h3>A new address. A new chapter.</h3>
              <p>
                Add a property and bring its
                <br />
                people and payments together.
              </p>
              <strong>
                Add new property <ArrowUpRight size={15} />
              </strong>
            </button>
          )}
        </div>
      )}
    </>
  );
}

export function TenantsPanel({ ctx }: { ctx: WorkspaceContext }) {
  const tenants = useData(ctx, "tenants");
  const tenancies = useData(ctx, "tenancies");
  const units = useData(ctx, "units");
  const charges = useData(ctx, "charges", canFinance(ctx.org.role));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const error = [tenants.error, tenancies.error, units.error, charges.error].find(Boolean);
  if (error) return <ErrorBox message={error.message} retry={() => void ctx.refresh()} />;
  if (
    !tenants.data ||
    !tenancies.data ||
    !units.data ||
    (canFinance(ctx.org.role) && !charges.data)
  )
    return <Loading />;
  const rows = tenants.data
    .map((person) => {
      const leases = tenancies.data.filter((t) => t.tenant_id === person.id);
      const active = leases.find((t) => t.status === "active");
      const unit = units.data.find((u) => u.id === active?.unit_id);
      const overdue = (charges.data ?? [])
        .filter((c) => leases.some((t) => t.id === c.tenancy_id) && c.overdue)
        .reduce((sum, c) => sum + c.balance, 0);
      return { person, active, unit, overdue };
    })
    .filter((r) =>
      `${r.person.name} ${r.person.email} ${r.person.phone}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .filter((r) => filter === "all" || (filter === "overdue" ? r.overdue > 0 : !!r.active));
  return (
    <>
      <div className="toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            placeholder="Search tenant name, email, phone..."
            aria-label="Search tenants"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {canManageTenants(ctx.org.role) && (
          <div className="toolbar-actions">
            <button className="button secondary" onClick={() => ctx.openForm("tenancy")}>
              Assign tenancy
            </button>
            <button className="button primary" onClick={() => ctx.openForm("tenant")}>
              <Plus size={17} /> Onboard tenant
            </button>
          </div>
        )}
      </div>
      <div className="filter-chips">
        {["all", "active", ...(canFinance(ctx.org.role) ? ["overdue"] : [])].map((value) => (
          <button
            className={filter === value ? "selected" : ""}
            key={value}
            onClick={() => setFilter(value)}
          >
            {value === "all"
              ? "All tenants"
              : value === "active"
                ? "Active tenancies"
                : "Overdue balances"}
          </button>
        ))}
      </div>
      {!rows.length ? (
        <Empty title="No tenants to show">
          Register a tenant and assign a tenancy to start their account history.
        </Empty>
      ) : (
        <section className="surface table-surface">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Unit / reference</th>
                  <th>Monthly rent</th>
                  {canFinance(ctx.org.role) && <th>Overdue</th>}
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ person, active, unit, overdue }) => (
                  <tr key={person.id}>
                    <td>
                      <div className="person-cell">
                        <span className="avatar warm">{person.name.slice(0, 2).toUpperCase()}</span>
                        <div>
                          <strong>{person.name}</strong>
                          <small>{person.email || person.phone || "No contact added"}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{unit ? `${unit.building} · ${unit.number}` : "Not assigned"}</strong>
                      <small>{active?.reference ?? "No active tenancy"}</small>
                    </td>
                    <td>{active ? money(active.rent, ctx.org.currency) : "—"}</td>
                    {canFinance(ctx.org.role) && (
                      <td className={overdue ? "red-text" : "muted"}>
                        {money(overdue, ctx.org.currency)}
                      </td>
                    )}
                    <td>
                      <Badge tone={overdue ? "red" : active ? "green" : "neutral"}>
                        {overdue ? "Overdue" : active ? "Active" : "Unassigned"}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="inline-link"
                        onClick={() => ctx.openForm({ kind: "tenant-detail", id: person.id })}
                      >
                        View profile <ArrowUpRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <div className="privacy-note">
        <ShieldCheck size={18} />
        <p>
          Only information necessary for property management is collected. This software does not
          itself establish legal compliance.
        </p>
      </div>
    </>
  );
}

function PaymentTable({ ctx, payments }: { ctx: WorkspaceContext; payments: Queries["payments"] }) {
  if (!payments.length)
    return (
      <Empty title="No payments recorded yet">Confirmed payment activity will appear here.</Empty>
    );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Tenant / property</th>
            <th>Reference</th>
            <th>Date received</th>
            <th>Source</th>
            <th>Amount</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Receipt</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td>
                <div className="person-cell">
                  <span className="payment-icon">
                    <ArrowDownLeft size={17} />
                  </span>
                  <div>
                    <strong>{p.tenant}</strong>
                    <small>
                      {p.property_name} · {p.unit}
                    </small>
                  </div>
                </div>
              </td>
              <td>
                <span className="mono">{p.reference || "No reference"}</span>
                <small>{p.method}</small>
              </td>
              <td>{new Date(p.received_on + "T12:00:00").toLocaleDateString("en-KE")}</td>
              <td>
                <Badge>
                  {p.provenance === "statement_import" ? "Statement imported" : "Manually recorded"}
                </Badge>
              </td>
              <td>
                <strong>{money(p.amount, p.currency)}</strong>
              </td>
              <td>
                <Badge tone={p.reversed_at ? "red" : "green"}>
                  {p.reversed_at ? "Reversed" : "Recorded"}
                </Badge>
              </td>
              <td>
                <button
                  className="inline-link"
                  onClick={() => ctx.openForm({ kind: "receipt", id: p.id })}
                >
                  Details <ArrowUpRight size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PaymentsPanel({ ctx }: { ctx: WorkspaceContext }) {
  const finance = canFinance(ctx.org.role);
  const payments = useData(ctx, "payments");
  const charges = useData(ctx, "charges");
  const reconciliation = useData(ctx, "reconciliation", finance);
  const tenancies = useData(ctx, "tenancies");
  const tenants = useData(ctx, "tenants");
  const imports = useData(ctx, "imports", finance);
  const [section, setSection] = useState("invoices");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const firstError = [
    payments.error,
    charges.error,
    reconciliation.error,
    tenancies.error,
    tenants.error,
    imports.error,
  ].find(Boolean);
  if (firstError) return <ErrorBox message={firstError.message} retry={() => void ctx.refresh()} />;
  if (
    !payments.data ||
    !charges.data ||
    !tenancies.data ||
    !tenants.data ||
    (finance && (!reconciliation.data || !imports.data))
  )
    return <Loading />;
  const filtered = charges.data
    .filter((c) => c.period === ctx.period || section === "arrears")
    .filter((c) => section !== "arrears" || c.overdue);
  const tenantName = (id: string) =>
    tenants.data.find((t) => t.id === tenancies.data.find((lease) => lease.id === id)?.tenant_id)
      ?.name ?? id;
  async function act(key: string, operation: () => Promise<unknown>) {
    setBusy(key);
    setError("");
    try {
      await operation();
      await ctx.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Operation failed.");
    } finally {
      setBusy("");
    }
  }
  async function exportLedger() {
    await act("export", async () => {
      const response = await fetch("/api/v1/exports/ledger.csv", {
        headers: { "X-Organization": ctx.org.id },
      });
      if (!response.ok) throw new Error("Could not export ledger. Please retry.");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "JOJOBUILDS-ledger.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }
  return (
    <>
      <div className="toolbar">
        <div className="segmented">
          {["invoices", ...(finance ? ["reconcile"] : []), "arrears"].map((value) => (
            <button
              key={value}
              className={section === value ? "selected" : ""}
              onClick={() => setSection(value)}
            >
              {value === "invoices" ? "Invoices" : value === "reconcile" ? "Reconcile" : "Arrears"}
              {value === "reconcile" && !!reconciliation.data?.length && (
                <span>{reconciliation.data.length}</span>
              )}
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          <button
            className="button secondary"
            onClick={() => void exportLedger()}
            disabled={!!busy}
          >
            <ArrowDownToLine size={16} /> Export ledger
          </button>
          {finance && (
            <>
              <button
                className="button secondary"
                disabled={!!busy}
                onClick={() =>
                  void act("bill", () => ctx.api.post("/billing/generate", { period: ctx.period }))
                }
              >
                <RefreshCw size={16} /> Generate rent
              </button>
              <button className="button primary" onClick={() => ctx.openForm("import")}>
                <Upload size={16} /> Import statement
              </button>
            </>
          )}
        </div>
      </div>
      {error && <ErrorBox message={error} />}
      {section === "reconcile" ? (
        <>
          <div className="info-strip">
            <ShieldCheck size={19} />
            <p>
              <strong>You’re in control of every match.</strong> Suggestions use references, not
              proof of payment. Check the statement before confirming. Duplicate-looking rows need
              an explicit reason.
            </p>
          </div>
          {!reconciliation.data?.length ? (
            <Empty title="Your review inbox is clear">
              Import a statement to review incoming payments.
            </Empty>
          ) : (
            <div className="reconciliation-grid">
              {reconciliation.data.map((row) => (
                <article className="reconcile-card" key={row.id}>
                  <div className="split">
                    <strong className="reconcile-amount">
                      {money(row.amount, ctx.org.currency)}
                    </strong>
                    <Badge
                      tone={
                        row.status === "duplicate_review"
                          ? "red"
                          : row.suggestions.length === 1
                            ? "green"
                            : "amber"
                      }
                    >
                      {row.status === "duplicate_review"
                        ? "Possible duplicate"
                        : row.suggestions.length === 1
                          ? "Reference match"
                          : "Needs review"}
                    </Badge>
                  </div>
                  <p className="mono">
                    {row.reference || "No transaction reference"} · {row.date}
                  </p>
                  <div className="transaction-description">{row.description}</div>
                  <small className="muted">{row.filename}</small>
                  <label className="field">
                    <span>Allocate to tenancy</span>
                    <select
                      value={
                        choices[row.id] ??
                        (row.suggestions.length === 1 ? row.suggestions[0].tenancy_id : "")
                      }
                      onChange={(e) => setChoices({ ...choices, [row.id]: e.target.value })}
                    >
                      <option value="">Choose a tenancy</option>
                      {tenancies.data.map((t) => (
                        <option value={t.id} key={t.id}>
                          {tenantName(t.id)} · {t.reference}
                        </option>
                      ))}
                    </select>
                  </label>
                  {row.suggestions.map((s) => (
                    <p className="match-explanation" key={s.tenancy_id}>
                      <CheckCheck size={14} />
                      {s.reason}
                    </p>
                  ))}
                  <label className="field">
                    <span>Review reason / source evidence</span>
                    <input
                      id={`reason-${row.id}`}
                      placeholder="Explain what you checked"
                      minLength={row.status === "duplicate_review" ? 15 : 5}
                      maxLength={300}
                    />
                  </label>
                  <div className="reconcile-actions">
                    {(["confirm", "reject", "defer"] as const).map((action) => (
                      <button
                        key={action}
                        className={`button ${action === "confirm" ? "primary" : "secondary"}`}
                        disabled={!!busy}
                        onClick={() => {
                          const input = document.getElementById(`reason-${row.id}`);
                          const reason = input instanceof HTMLInputElement ? input.value : "";
                          const tenancyId =
                            choices[row.id] ??
                            (row.suggestions.length === 1 ? row.suggestions[0].tenancy_id : null);
                          if (reason.length < 5 || (action === "confirm" && !tenancyId)) {
                            setError(
                              "Choose a tenancy and provide a review reason before confirming.",
                            );
                            return;
                          }
                          void act(row.id, () =>
                            ctx.api.post(`/reconciliation/${row.id}`, {
                              action,
                              tenancy_id: tenancyId,
                              reason,
                            }),
                          );
                        }}
                      >
                        {action === "confirm" ? (
                          <>
                            <Check size={14} /> Confirm & post
                          </>
                        ) : action === "reject" ? (
                          "Reject"
                        ) : (
                          "Defer"
                        )}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
          <section className="surface">
            <SectionHead title="Statement history" label="IMPORT AUDIT TRAIL" />
            {!imports.data?.length ? (
              <Empty title="No statements imported" />
            ) : (
              imports.data.map((batch) => (
                <div className="simple-row" key={batch.id}>
                  <FileSpreadsheet size={19} />
                  <div className="row-grow">
                    <strong>{batch.filename}</strong>
                    <small>
                      Account label: {batch.account} ·{" "}
                      {new Date(batch.created_at).toLocaleString("en-KE")}
                    </small>
                  </div>
                  <span className="muted">Source artifact retained</span>
                </div>
              ))
            )}
          </section>
        </>
      ) : (
        <section className="surface">
          <SectionHead
            title={section === "arrears" ? "Overdue charges" : `Charges · ${ctx.period}`}
            label="RENT & BILLS"
            action={
              finance ? (
                <button className="inline-link" onClick={() => ctx.openForm("charge")}>
                  Add a charge <Plus size={14} />
                </button>
              ) : undefined
            }
          />
          {!filtered.length ? (
            <Empty
              title={section === "arrears" ? "No overdue charges" : "No charges for this month"}
            >
              {finance
                ? "Generate rent or add an explicit charge. Mid-month starts require an agreed manual first-period charge."
                : "Your property manager will publish charges here."}
            </Empty>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tenant / charge</th>
                    <th>Due date</th>
                    <th>Billed</th>
                    <th>Allocated</th>
                    <th>Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{tenantName(c.tenancy_id)}</strong>
                        <small>
                          {c.description} · {c.kind}
                        </small>
                      </td>
                      <td>{c.due_date}</td>
                      <td>{money(c.amount, c.currency)}</td>
                      <td>{money(c.allocated, c.currency)}</td>
                      <td>{money(c.balance, c.currency)}</td>
                      <td>
                        <Badge tone={c.overdue ? "red" : !c.balance ? "green" : "amber"}>
                          {c.overdue
                            ? "Overdue"
                            : !c.balance
                              ? "Settled"
                              : c.allocated
                                ? "Part paid"
                                : "Due"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      <section className="surface">
        <SectionHead title="Recorded payments" label="PAYMENT HISTORY" />
        <PaymentTable ctx={ctx} payments={payments.data} />
      </section>
    </>
  );
}

export function MaintenancePanel({ ctx }: { ctx: WorkspaceContext }) {
  const requests = useData(ctx, "maintenance");
  const [filter, setFilter] = useState("open");
  if (requests.error)
    return <ErrorBox message={requests.error.message} retry={() => void ctx.refresh()} />;
  if (!requests.data) return <Loading />;
  const filtered = requests.data.filter(
    (r) => filter === "all" || !["closed", "resolved"].includes(r.status),
  );
  return (
    <>
      <div className="toolbar">
        <div className="filter-chips">
          {["open", "all"].map((value) => (
            <button
              key={value}
              className={filter === value ? "selected" : ""}
              onClick={() => setFilter(value)}
            >
              {value === "open" ? "Needs attention" : "All requests"}
            </button>
          ))}
        </div>
        <button className="button primary" onClick={() => ctx.openForm("maintenance")}>
          <Plus size={16} /> New request
        </button>
      </div>
      {!filtered.length ? (
        <Empty title="A little peace and quiet">No maintenance requests match this view.</Empty>
      ) : (
        <div className="maintenance-grid">
          {filtered.map((r: Maintenance) => (
            <article className="surface maintenance-card" key={r.id}>
              <div className="split">
                <span className="metric-icon">
                  <Wrench size={19} />
                </span>
                <Badge tone={r.priority === "urgent" || r.priority === "high" ? "red" : "neutral"}>
                  {r.priority}
                </Badge>
              </div>
              <h2>{r.title}</h2>
              <p>{r.description}</p>
              <div className="split">
                <Badge tone={["resolved", "closed"].includes(r.status) ? "green" : "amber"}>
                  {r.status.replaceAll("_", " ")}
                </Badge>
                <small>{r.category}</small>
              </div>
              <p className="muted">Assigned to: {r.assigned_to || "Awaiting assignment"}</p>
              {r.cost !== null && (
                <small className="muted">Recorded cost: {money(r.cost, ctx.org.currency)}</small>
              )}
              {r.updates.length > 0 && (
                <div className="request-history">
                  {r.updates.slice(-3).map((u) => (
                    <div key={u.at}>
                      <span className="dot" />
                      <p>
                        <strong>{u.status.replaceAll("_", " ")}</strong>
                        <small>{u.note}</small>
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {canMaintain(ctx.org.role) && (
                <button
                  className="button secondary wide"
                  onClick={() => ctx.openForm({ kind: "maintenance-update", id: r.id })}
                >
                  Update request <ArrowUpRight size={15} />
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export function NotificationsPanel({ ctx }: { ctx: WorkspaceContext }) {
  const notices = useData(ctx, "notifications");
  const [error, setError] = useState("");
  if (notices.error)
    return <ErrorBox message={notices.error.message} retry={() => void ctx.refresh()} />;
  if (!notices.data) return <Loading />;
  return (
    <section className="surface">
      <SectionHead title="Your notification center" label="IN THE LOOP" />
      {error && <ErrorBox message={error} />}
      {!notices.data.length ? (
        <Empty title="You’re all caught up">Operational updates will appear here.</Empty>
      ) : (
        notices.data.map((n) => (
          <div className={`notification-row ${n.read ? "read" : ""}`} key={n.id}>
            <span className="metric-icon">
              <Bell size={18} />
            </span>
            <div className="row-grow">
              <strong>{n.title}</strong>
              <p>{n.body}</p>
              <small>{new Date(n.created_at).toLocaleString("en-KE")}</small>
            </div>
            {!n.read && (
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    setError("");
                    await ctx.api.post(`/notifications/${n.id}/read`, {});
                    await ctx.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Could not update notification.");
                  }
                }}
              >
                Mark read
              </button>
            )}
          </div>
        ))
      )}
    </section>
  );
}

export function SettingsPanel({ ctx }: { ctx: WorkspaceContext }) {
  const integrations = useData(ctx, "integrations");
  const members = useData(ctx, "members", ctx.org.role === "owner");
  const audit = useData(ctx, "audit", ctx.org.role === "owner");
  const [error, setError] = useState("");
  const firstError = [integrations.error, members.error, audit.error].find(Boolean);
  if (firstError) return <ErrorBox message={firstError.message} retry={() => void ctx.refresh()} />;
  return (
    <div className="settings-stack">
      <section className="surface">
        <SectionHead title={ctx.org.name} label="WORKSPACE DETAILS" />
        <div className="settings-details">
          <div>
            <small>Currency</small>
            <strong>{ctx.org.currency}</strong>
          </div>
          <div>
            <small>Property timezone</small>
            <strong>{ctx.org.timezone}</strong>
          </div>
          <div>
            <small>Your access</small>
            <strong>{ctx.org.role}</strong>
          </div>
        </div>
        <div className="privacy-note">
          <ShieldCheck size={18} />
          <p>
            Financial records are retained with an audit trail. Export your data and maintain
            encrypted backups before using real tenant information.
          </p>
        </div>
      </section>
      {ctx.org.role === "owner" && (
        <section className="surface">
          <SectionHead
            title="People & access"
            label="YOUR TEAM"
            action={
              <button className="button primary" onClick={() => ctx.openForm("invite")}>
                <Mail size={15} /> Send invitation
              </button>
            }
          />
          {error && <ErrorBox message={error} />}
          {members.data?.map((member) => (
            <div className="simple-row" key={member.id}>
              <span className="avatar warm">{member.name.slice(0, 2)}</span>
              <div className="row-grow">
                <strong>{member.name}</strong>
                <small>
                  {member.email} · {member.role} · {member.property_ids.length} assigned properties
                </small>
              </div>
              <Badge tone={member.active ? "green" : "neutral"}>
                {member.active ? "Active" : "Inactive"}
              </Badge>
              {member.role !== "owner" && member.active && (
                <button
                  className="text-button red-text"
                  onClick={async () => {
                    if (!window.confirm(`Deactivate ${member.name}'s access to this organization?`))
                      return;
                    try {
                      await ctx.api.post(`/members/${member.id}/deactivate`, {});
                      await ctx.refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Access change failed.");
                    }
                  }}
                >
                  Deactivate
                </button>
              )}
            </div>
          ))}
        </section>
      )}
      <section className="surface">
        <SectionHead title="Connections, without the guesswork" label="INTEGRATIONS" />
        {integrations.data?.map((integration) => (
          <div className="simple-row" key={integration.name}>
            <span className="metric-icon">
              <FileCheck2 size={19} />
            </span>
            <div className="row-grow">
              <strong>{integration.name}</strong>
              <small>{integration.reason}</small>
            </div>
            <Badge tone="amber">Not configured</Badge>
          </div>
        ))}
      </section>
      {ctx.org.role === "owner" && (
        <section className="surface">
          <SectionHead title="Recent audit history" label="TRACEABLE BY DESIGN" />
          {audit.data?.slice(0, 30).map((event) => (
            <div className="simple-row" key={event.id}>
              <ShieldCheck size={16} />
              <div className="row-grow">
                <strong>{event.action.replaceAll(".", " · ")}</strong>
                <small className="mono">{event.entity_id}</small>
              </div>
              <small>{new Date(event.created_at).toLocaleString("en-KE")}</small>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
