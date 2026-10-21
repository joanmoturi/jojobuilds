"use client";

import {
  canFinance,
  canManageTenants,
  money,
  parseMoney,
  parseOptionalMoney,
  type Preview,
} from "@jojobuilds/api-client";
import { ArrowRight, Check, FileSpreadsheet, LoaderCircle, Printer, Upload } from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { WorkspaceContext } from "./workspace";
import { useData, type FormKind } from "./workspace-panels";
import { Badge, ErrorBox, Field, Loading, Modal } from "./ui";

const titles: Record<string, string> = {
  property: "Add a property",
  unit: "Add a unit",
  tenant: "Register a tenant",
  tenancy: "Start a tenancy",
  payment: "Record a payment",
  charge: "Add a charge",
  import: "Import a statement",
  invite: "Invite someone",
  maintenance: "New maintenance request",
  "maintenance-update": "Update maintenance",
  reverse: "Reverse a payment",
  "tenant-detail": "Tenant account",
  "property-edit": "Edit property",
  "end-tenancy": "End a tenancy",
  receipt: "Payment acknowledgement",
};
const requiredText = z.string().trim().min(1, "Fill in all required fields.");

export function WorkspaceForm({
  kind,
  ctx,
  close,
}: {
  kind: FormKind;
  ctx: WorkspaceContext;
  close: () => void;
}) {
  const action = typeof kind === "string" ? kind : kind.kind;
  const id = typeof kind === "string" ? "" : kind.id;
  const properties = useData(ctx, "properties");
  const units = useData(ctx, "units");
  const tenants = useData(
    ctx,
    "tenants",
    canManageTenants(ctx.org.role) || canFinance(ctx.org.role) || ctx.org.role === "tenant",
  );
  const tenancies = useData(
    ctx,
    "tenancies",
    canManageTenants(ctx.org.role) || canFinance(ctx.org.role) || ctx.org.role === "tenant",
  );
  const requests = useData(ctx, "maintenance", action === "maintenance-update");
  const payments = useData(ctx, "payments", action === "receipt" || action === "reverse");
  const charges = useData(ctx, "charges", action === "tenant-detail" && canFinance(ctx.org.role));
  const existingProperty = properties.data?.find((p) => p.id === id);
  const request = requests.data?.find((r) => r.id === id);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Record<string, string>>();
  const [error, setError] = useState("");
  const [paymentKey] = useState(() => crypto.randomUUID());
  const [receiptPrint, setReceiptPrint] = useState(false);
  const resourceError = [
    properties.error,
    units.error,
    tenants.error,
    tenancies.error,
    requests.error,
    payments.error,
    charges.error,
  ].find(Boolean);

  async function submit(values: Record<string, string>) {
    setError("");
    try {
      const text = (name: string) => requiredText.parse(values[name] ?? "");
      const blank = (name: string) => values[name]?.trim() ?? "";
      switch (action) {
        case "property":
        case "property-edit": {
          const body = {
            name: text("name"),
            location: text("location"),
            county: blank("county"),
            contact: blank("contact"),
            archived: values.archived === "true",
          };
          if (action === "property-edit")
            await ctx.api.request(`/properties/${id}`, {
              method: "PUT",
              body: JSON.stringify(body),
            });
          else await ctx.api.post("/properties", body);
          break;
        }
        case "unit":
          await ctx.api.post("/units", {
            property_id: text("property_id"),
            number: text("number"),
            building: text("building"),
            floor: blank("floor"),
            unit_type: blank("unit_type") || "Residential",
            default_rent: parseMoney(text("amount")),
          });
          break;
        case "tenant":
          await ctx.api.post("/tenants", {
            name: text("name"),
            email: blank("email"),
            phone: blank("phone"),
            emergency_contact: blank("emergency_contact"),
          });
          break;
        case "tenancy":
          await ctx.api.post("/tenancies", {
            tenant_id: text("tenant_id"),
            unit_id: text("unit_id"),
            reference: text("reference"),
            rent: parseMoney(text("amount")),
            deposit: parseOptionalMoney(blank("deposit")),
            due_day: Number(text("due_day")),
            start_date: text("start_date"),
            end_date: blank("end_date") || null,
          });
          break;
        case "payment":
          await ctx.api.post("/payments", {
            tenancy_id: text("tenancy_id"),
            amount: parseMoney(text("amount")),
            received_on: text("received_on"),
            method: text("method"),
            purpose: text("purpose"),
            reference: blank("reference"),
            idempotency_key: paymentKey,
          });
          break;
        case "charge":
          await ctx.api.post("/charges", {
            tenancy_id: text("tenancy_id"),
            amount: parseMoney(text("amount")),
            period: text("period"),
            due_date: text("due_date"),
            kind: text("kind"),
            description: text("description"),
          });
          break;
        case "reverse":
          await ctx.api.post(`/payments/${id}/reverse`, { reason: text("reason") });
          break;
        case "end-tenancy":
          await ctx.api.post(`/tenancies/${id}/end`, {
            end_date: text("end_date"),
            reason: text("reason"),
          });
          break;
        case "invite":
          await ctx.api.post("/invitations", {
            email: text("email"),
            role: text("role"),
            tenant_id: blank("tenant_id") || null,
            property_ids: blank("property_id") ? [blank("property_id")] : [],
          });
          break;
        case "maintenance":
          await ctx.api.post("/maintenance", {
            property_id: text("property_id"),
            tenancy_id: blank("tenancy_id") || null,
            title: text("title"),
            description: text("description"),
            category: text("category"),
            priority: text("priority"),
          });
          break;
        case "maintenance-update":
          await ctx.api.post(`/maintenance/${id}`, {
            status: text("status"),
            note: text("note"),
            assigned_to: blank("assigned_to"),
            cost: parseOptionalMoney(blank("cost")),
          });
          break;
      }
      await ctx.refresh();
      close();
    } catch (problem) {
      setError(
        problem instanceof z.ZodError
          ? problem.issues[0].message
          : problem instanceof Error
            ? problem.message
            : "Could not save. Please retry.",
      );
    }
  }

  function input(
    name: string,
    label: string,
    type = "text",
    defaultValue = "",
    required = true,
    minLength?: number,
  ) {
    return (
      <Field label={label}>
        <input
          {...register(name)}
          type={type}
          defaultValue={defaultValue}
          required={required}
          minLength={minLength}
          maxLength={type === "text" ? 200 : undefined}
          step={type === "number" ? "0.01" : undefined}
          min={type === "number" ? "0" : undefined}
        />
      </Field>
    );
  }
  function select(
    name: string,
    label: string,
    options: { id: string; label: string }[],
    defaultValue = "",
    required = true,
  ) {
    return (
      <Field label={label}>
        <select {...register(name)} defaultValue={defaultValue} required={required}>
          <option value="">Choose...</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  const propertyOptions = properties.data?.map((p) => ({ id: p.id, label: p.name })) ?? [];
  const tenancyOptions =
    tenancies.data?.map((t) => ({
      id: t.id,
      label: `${tenants.data?.find((person) => person.id === t.tenant_id)?.name ?? t.reference} · ${t.reference}`,
    })) ?? [];
  const today = new Date().toLocaleDateString("en-CA", { timeZone: ctx.org.timezone });

  if (action === "import")
    return (
      <Modal title={titles[action]} close={close}>
        <ImportForm ctx={ctx} close={close} />
      </Modal>
    );
  if (action === "receipt") {
    const payment = payments.data?.find((p) => p.id === id);
    return (
      <Modal title={titles[action]} close={close}>
        {payments.error ? (
          <ErrorBox message={payments.error.message} />
        ) : !payment ? (
          <Loading />
        ) : (
          <div className={receiptPrint ? "receipt print-receipt" : "receipt"}>
            <span className="eyebrow">JOJOBUILDS · PAYMENT RECORD</span>
            <h2>{money(payment.amount, payment.currency)}</h2>
            <Badge tone={payment.reversed_at ? "red" : "green"}>
              {payment.reversed_at ? "Reversed" : "Recorded payment"}
            </Badge>
            <dl>
              <dt>Tenant</dt>
              <dd>{payment.tenant}</dd>
              <dt>Property / unit</dt>
              <dd>
                {payment.property_name} · {payment.unit}
              </dd>
              <dt>Date received</dt>
              <dd>{payment.received_on}</dd>
              <dt>Reference</dt>
              <dd>{payment.reference || "Not provided"}</dd>
              <dt>Method</dt>
              <dd>{payment.method}</dd>
              <dt>Source</dt>
              <dd>
                {payment.provenance === "statement_import"
                  ? "Statement imported"
                  : "Manually recorded"}
              </dd>
              <dt>Allocated to charges</dt>
              <dd>{money(payment.allocated, payment.currency)}</dd>
              <dt>Record ID</dt>
              <dd className="mono">{payment.id}</dd>
            </dl>
            <p className="muted">
              This acknowledges an entry in the property ledger. It is not independent bank
              authentication or a tax invoice.
            </p>
            {payment.reversal_reason && (
              <ErrorBox message={`Reversal: ${payment.reversal_reason}`} />
            )}
            <div className="form-footer no-print">
              <button
                className="button secondary"
                onClick={() => {
                  setReceiptPrint(true);
                  setTimeout(() => window.print(), 50);
                }}
              >
                <Printer size={16} /> Print
              </button>
              {canFinance(ctx.org.role) && !payment.reversed_at && (
                <button
                  className="button danger"
                  onClick={() => {
                    close();
                    ctx.openForm({ kind: "reverse", id });
                  }}
                >
                  Reverse payment
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    );
  }
  if (action === "tenant-detail") {
    const person = tenants.data?.find((t) => t.id === id);
    const leases = tenancies.data?.filter((t) => t.tenant_id === id) ?? [];
    return (
      <Modal title={person?.name ?? "Tenant account"} close={close}>
        {resourceError ? (
          <ErrorBox message={resourceError.message} />
        ) : !person ? (
          <Loading />
        ) : (
          <div className="form-body">
            <div className="profile-summary">
              <span className="avatar large warm">{person.name.slice(0, 2)}</span>
              <div>
                <h3>{person.name}</h3>
                <p>
                  {person.email || "No email"} · {person.phone || "No phone"}
                </p>
                <Badge tone={person.linked ? "green" : "neutral"}>
                  {person.linked ? "Portal linked" : "Portal not invited"}
                </Badge>
              </div>
            </div>
            {person.emergency_contact && <p>Emergency contact: {person.emergency_contact}</p>}
            {leases.map((lease) => (
              <section className="lease-detail" key={lease.id}>
                <div className="split">
                  <h3>{lease.reference}</h3>
                  <Badge tone={lease.status === "active" ? "green" : "neutral"}>
                    {lease.status}
                  </Badge>
                </div>
                <p>
                  {lease.start_date} — {lease.end_date || "Ongoing"}
                </p>
                <p>
                  Rent {money(lease.rent, ctx.org.currency)} · Due day {lease.due_day}
                </p>
                <p>
                  Agreed deposit {money(lease.deposit, ctx.org.currency)} (agreement amount, not
                  proof of receipt)
                </p>
                {canFinance(ctx.org.role) && (
                  <p>
                    Outstanding charges:{" "}
                    {money(
                      (charges.data ?? [])
                        .filter((c) => c.tenancy_id === lease.id)
                        .reduce((sum, c) => sum + c.balance, 0),
                      ctx.org.currency,
                    )}
                  </p>
                )}
                {canManageTenants(ctx.org.role) && lease.status === "active" && (
                  <button
                    className="button secondary"
                    onClick={() => {
                      close();
                      ctx.openForm({ kind: "end-tenancy", id: lease.id });
                    }}
                  >
                    End tenancy
                  </button>
                )}
              </section>
            ))}
            {!leases.length && (
              <p>No tenancy assigned. Use “Assign tenancy” to start their account.</p>
            )}
            <p className="privacy-note">
              Identity documents are not collected in this release. Use only necessary contact
              information.
            </p>
          </div>
        )}
      </Modal>
    );
  }

  return (
    <Modal title={titles[action]} close={close}>
      {resourceError ? (
        <ErrorBox message={resourceError.message} />
      ) : (
        <form onSubmit={handleSubmit(submit)}>
          <div className="form-body">
            {(action === "property" || action === "property-edit") && (
              <>
                {input("name", "Property name", "text", existingProperty?.name)}
                {input("location", "Address / location", "text", existingProperty?.location)}
                <div className="form-grid">
                  {input("county", "County", "text", existingProperty?.county, false)}
                  {input(
                    "contact",
                    "Tenant-visible property contact",
                    "text",
                    existingProperty?.contact,
                    false,
                  )}
                </div>
                {action === "property-edit" &&
                  select(
                    "archived",
                    "Property status",
                    [
                      { id: "false", label: "Active" },
                      { id: "true", label: "Archive (no active tenancies)" },
                    ],
                    "false",
                  )}
              </>
            )}
            {action === "unit" && (
              <>
                {select("property_id", "Property", propertyOptions)}
                <div className="form-grid">
                  {input("building", "Building / block", "text", "Main")}
                  {input("number", "Unit number")}
                </div>
                <div className="form-grid">
                  {input("floor", "Floor", "text", "", false)}
                  {input("unit_type", "Unit type", "text", "Residential")}
                </div>
                {input("amount", `Default monthly rent (${ctx.org.currency})`, "number")}
              </>
            )}
            {action === "tenant" && (
              <>
                {input("name", "Full name")}
                {input("email", "Email address", "email", "", false)}
                {input("phone", "Phone number", "tel", "", false)}
                {input("emergency_contact", "Emergency contact (optional)", "text", "", false)}
                <p className="muted">
                  Registration does not send an invitation. Invite the tenant separately when their
                  tenancy is ready.
                </p>
              </>
            )}
            {action === "tenancy" && (
              <>
                {select(
                  "tenant_id",
                  "Tenant",
                  tenants.data?.map((p) => ({ id: p.id, label: p.name })) ?? [],
                )}
                {select(
                  "unit_id",
                  "Vacant unit",
                  units.data
                    ?.filter((u) => !u.occupied)
                    .map((u) => ({
                      id: u.id,
                      label: `${properties.data?.find((p) => p.id === u.property_id)?.name ?? ""} · ${u.building} ${u.number}`,
                    })) ?? [],
                )}
                {input("reference", "Unique payment reference (letters, numbers, hyphens)")}
                <div className="form-grid">
                  {input("amount", `Agreed monthly rent (${ctx.org.currency})`, "number")}
                  {input("deposit", "Agreed deposit", "number", "0", false)}
                </div>
                <div className="form-grid">
                  {input("start_date", "Start date", "date", today)}
                  {input("end_date", "End date (optional)", "date", "", false)}
                </div>
                {input("due_day", "Rent due day (1–31)", "number", "5")}
                <p className="muted">
                  Mid-month first periods require an explicitly agreed manual charge. No automatic
                  proration or late fees.
                </p>
              </>
            )}
            {(action === "payment" || action === "charge") &&
              select("tenancy_id", "Tenancy", tenancyOptions)}
            {action === "payment" && (
              <>
                {input("amount", `Amount received (${ctx.org.currency})`, "number")}
                {input("received_on", "Date received", "date", today)}
                {select(
                  "purpose",
                  "Payment purpose",
                  [
                    { id: "rent", label: "Rent and bills" },
                    { id: "deposit", label: "Deposit only (separate from rent)" },
                  ],
                  "rent",
                )}
                {select(
                  "method",
                  "Payment method",
                  ["bank", "mpesa", "cash", "cheque"].map((value) => ({
                    id: value,
                    label: value === "mpesa" ? "M-Pesa (manually recorded)" : value,
                  })),
                  "bank",
                )}
                {input("reference", "Transaction reference (optional)", "text", "", false)}
                <div className="info-strip">
                  <FileSpreadsheet size={18} />
                  <p>
                    This records an owner-confirmed receipt, not a bank-verified transaction.
                    Allocation is oldest-charge-first within the selected purpose. Deposit receipts
                    never pay rent.
                  </p>
                </div>
              </>
            )}
            {action === "charge" && (
              <>
                {select(
                  "kind",
                  "Charge type",
                  ["rent", "water", "service", "deposit", "opening", "adjustment"].map((value) => ({
                    id: value,
                    label: value,
                  })),
                  "water",
                )}
                {input("description", "Description")}
                {input("amount", `Amount (${ctx.org.currency})`, "number")}
                <div className="form-grid">
                  {input("period", "Billing period", "month", ctx.period)}
                  {input("due_date", "Due date", "date", today)}
                </div>
                <p className="muted">
                  One charge per type, tenancy and month. Deposits are tracked separately from rent.
                </p>
              </>
            )}
            {action === "reverse" && (
              <>
                <div className="error-box">
                  This will restore the balance previously covered by this payment. History and the
                  original entry are retained.
                </div>
                {input("reason", "Reason for reversal", "text", "", true, 5)}
              </>
            )}
            {action === "end-tenancy" && (
              <>
                {input("end_date", "Actual move-out date", "date", today)}
                {input("reason", "Reason / move-out note", "text", "", true, 5)}
                <p className="muted">
                  Ending a tenancy preserves its charges and payments. Deposit refunds and final
                  balances require separate review.
                </p>
              </>
            )}
            {action === "invite" && (
              <>
                {input("email", "Recipient email", "email")}
                {select(
                  "role",
                  "Role",
                  ["manager", "agent", "caretaker", "maintenance", "finance", "tenant"].map(
                    (value) => ({ id: value, label: value }),
                  ),
                  "tenant",
                )}
                {select(
                  "tenant_id",
                  "Existing tenant (required for tenant role)",
                  tenants.data?.map((p) => ({ id: p.id, label: `${p.name} · ${p.email}` })) ?? [],
                  "",
                  false,
                )}
                {select(
                  "property_id",
                  "Property assignment (staff only)",
                  propertyOptions,
                  "",
                  false,
                )}
                <p className="muted">
                  An invitation is queued in the mail outbox. Run the email worker with SMTP
                  configured to deliver it. Staff have no property access without an assignment.
                </p>
              </>
            )}
            {action === "maintenance" && (
              <>
                {select("property_id", "Property", propertyOptions)}
                {select(
                  "tenancy_id",
                  ctx.org.role === "tenant"
                    ? "Your tenancy"
                    : "Tenancy (optional for common areas)",
                  tenancyOptions,
                  "",
                  ctx.org.role === "tenant",
                )}
                {input("title", "Short title")}
                {input("description", "Describe the problem")}
                {select(
                  "category",
                  "Category",
                  ["Plumbing", "Electrical", "General", "Complaint", "Safety", "Inspection"].map(
                    (value) => ({ id: value, label: value }),
                  ),
                  "General",
                )}
                {select(
                  "priority",
                  "Priority",
                  ["low", "normal", "high", "urgent"].map((value) => ({ id: value, label: value })),
                  "normal",
                )}
              </>
            )}
            {action === "maintenance-update" && (
              <>
                {select(
                  "status",
                  "Status",
                  [
                    "submitted",
                    "acknowledged",
                    "assigned",
                    "in_progress",
                    "awaiting_parts",
                    "resolved",
                    "closed",
                  ].map((value) => ({ id: value, label: value.replaceAll("_", " ") })),
                  request?.status ?? "",
                )}
                {input(
                  "assigned_to",
                  "Assigned worker / service provider",
                  "text",
                  request?.assigned_to ?? "",
                  false,
                )}
                {input("note", "Tenant-visible progress note", "text", "", true, 3)}
                {input(
                  "cost",
                  `Total recorded cost (${ctx.org.currency})`,
                  "number",
                  ((request?.cost ?? 0) / 100).toString(),
                  false,
                )}
                <p className="muted">
                  Only valid workflow transitions are accepted by the server. Start by acknowledging
                  or assigning a submitted request.
                </p>
              </>
            )}
            {error && <ErrorBox message={error} />}
          </div>
          <footer className="form-footer">
            <button className="button secondary" type="button" onClick={close}>
              Cancel
            </button>
            <button
              className={`button ${action === "reverse" ? "danger" : "primary"}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle size={16} className="spin" /> Saving...
                </>
              ) : action === "reverse" ? (
                "Confirm reversal"
              ) : (
                <>
                  <Check size={16} /> Save & continue
                </>
              )}
            </button>
          </footer>
        </form>
      )}
    </Modal>
  );
}

function ImportForm({ ctx, close }: { ctx: WorkspaceContext; close: () => void }) {
  const properties = useData(ctx, "properties");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [property, setProperty] = useState("");
  const [account, setAccount] = useState("");
  const [mapping, setMapping] = useState({
    date: "",
    amount: "",
    description: "",
    reference: "",
    date_format: "%Y-%m-%d",
    decimal_separator: ".",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<"file" | "map" | "preview">("file");

  async function process(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      data.append("file", file);
      if (stage !== "file") data.append("mapping", JSON.stringify(mapping));
      if (stage === "preview") {
        data.append("property_id", property);
        data.append("account", account);
        await ctx.api.post("/imports", data);
        await ctx.refresh();
        close();
      } else {
        const result = await ctx.api.post<Preview>("/imports/preview", data);
        setPreview(result);
        if (stage === "file") {
          const find = (key: string) =>
            result.headers.find((h) => h.toLowerCase().includes(key)) ?? "";
          setMapping({
            ...mapping,
            date: find("date"),
            amount: find("amount"),
            description: find("description"),
            reference: find("reference"),
          });
          setStage("map");
        } else if (!result.errors.length) setStage("preview");
      }
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
    setStage("file");
    setPreview(null);
    setError("");
  };
  return (
    <form onSubmit={(event) => void process(event)}>
      <div className="form-body">
        <div className="import-steps">
          {["Choose file", "Map columns", "Preview & import"].map((label, index) => (
            <span
              className={["file", "map", "preview"].indexOf(stage) === index ? "active" : ""}
              key={label}
            >
              {index + 1}. {label}
            </span>
          ))}
        </div>
        <p className="muted">
          Use a statement in {ctx.org.currency}. Amounts must be signed major-unit values: credits
          positive, debits negative. No PDF parsing or currency conversion.
        </p>
        <Field label="Property">
          <select required value={property} onChange={(e) => setProperty(e.target.value)}>
            <option value="">Choose property...</option>
            {properties.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bank account nickname (not your account number)">
          <input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            required
            maxLength={80}
            placeholder="e.g. Rent collection account"
          />
        </Field>
        <Field label="Statement file">
          <input type="file" accept=".csv,.xlsx" onChange={chooseFile} required />
        </Field>
        <small className="muted">UTF-8 CSV or XLSX · up to 5 MB / 5,000 rows</small>
        {stage !== "file" && (
          <>
            <div className="form-grid">
              {(["date", "amount", "description", "reference"] as const).map((key) => (
                <Field
                  key={key}
                  label={`${key[0].toUpperCase() + key.slice(1)} column${key === "reference" ? " (optional)" : ""}`}
                >
                  <select
                    required={key !== "reference"}
                    value={mapping[key]}
                    onChange={(e) => {
                      setMapping({ ...mapping, [key]: e.target.value });
                      setStage("map");
                    }}
                  >
                    <option value="">Choose...</option>
                    {preview?.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            <div className="form-grid">
              <Field label="Date format">
                <select
                  value={mapping.date_format}
                  onChange={(e) => {
                    setMapping({ ...mapping, date_format: e.target.value });
                    setStage("map");
                  }}
                >
                  <option value="%Y-%m-%d">YYYY-MM-DD</option>
                  <option value="%d/%m/%Y">DD/MM/YYYY</option>
                  <option value="%m/%d/%Y">MM/DD/YYYY</option>
                </select>
              </Field>
              <Field label="Decimal separator">
                <select
                  value={mapping.decimal_separator}
                  onChange={(e) => {
                    setMapping({ ...mapping, decimal_separator: e.target.value });
                    setStage("map");
                  }}
                >
                  <option value=".">Period: 1,000.50</option>
                  <option value=",">Comma: 1.000,50</option>
                </select>
              </Field>
            </div>
          </>
        )}
        {!!preview?.errors.length && (
          <ErrorBox
            message={preview.errors
              .slice(0, 5)
              .map((row) => `Row ${row.row}: ${row.error}`)
              .join(" · ")}
          />
        )}
        {stage === "preview" && preview && (
          <>
            <div className="success-box">
              <Check size={16} /> {preview.total} valid transactions. Nothing is confirmed or
              allocated yet.
            </div>
            <div className="preview-rows">
              {preview.rows.map((row) => (
                <div key={row.row_number}>
                  <span>
                    {row.date} · {row.description}
                  </span>
                  <strong>{money(row.amount, ctx.org.currency)}</strong>
                </div>
              ))}
            </div>
            {preview.total > preview.rows.length && (
              <p className="muted">
                Showing the first {preview.rows.length} of {preview.total} valid rows.
              </p>
            )}
          </>
        )}
        {error && <ErrorBox message={error} />}
      </div>
      <footer className="form-footer">
        <button type="button" className="button secondary" onClick={close}>
          Cancel
        </button>
        <button className="button primary" disabled={busy || !file}>
          {busy ? (
            <>
              <LoaderCircle size={16} className="spin" /> Processing...
            </>
          ) : stage === "preview" ? (
            <>
              <Upload size={16} /> Import for review
            </>
          ) : stage === "map" ? (
            <>
              Preview transactions <ArrowRight size={16} />
            </>
          ) : (
            "Read column headers"
          )}
        </button>
      </footer>
    </form>
  );
}
