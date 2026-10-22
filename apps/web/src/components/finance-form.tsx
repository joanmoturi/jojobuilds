"use client";

import { canFinance, canManage, money, parseMoney } from "@jojobuilds/api-client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { WorkspaceContext } from "./workspace";
import { useData, type FormKind } from "./workspace-panels";
import { ErrorBox, Field, Loading, Modal } from "./ui";

const titles: Record<string, string> = {
  provider: "Add service provider",
  "provider-edit": "Edit service provider",
  payable: "Add provider bill",
  "provider-bill": "Add provider bill",
  "owner-obligation": "Add obligation / owner use",
  "outgoing-payment": "Record outgoing payment",
  "outgoing-reverse": "Reverse outgoing payment",
  "payable-void": "Void incorrect bill",
  "recurring-charge": "Set recurring charge",
  "recurring-edit": "Edit recurring charge",
};
export function isFinanceForm(kind: FormKind) {
  return (typeof kind === "string" ? kind : kind.kind) in titles;
}

export function FinanceForm({
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
  const providerForm = action === "provider" || action === "provider-edit";
  const recurring = action === "recurring-charge" || action === "recurring-edit";
  const paying = action === "outgoing-payment";
  const reasonForm = action === "outgoing-reverse" || action === "payable-void";
  const billForm =
    action === "payable" || action === "provider-bill" || action === "owner-obligation";
  const providers = useData(ctx, "providers", providerForm || billForm);
  const properties = useData(ctx, "properties", billForm);
  const jobs = useData(ctx, "maintenance", billForm);
  const payables = useData(ctx, "payables", paying);
  const rules = useData(ctx, "recurring-charges", recurring);
  const tenancies = useData(ctx, "tenancies", recurring);
  const tenants = useData(ctx, "tenants", recurring);
  const provider =
    action === "provider-edit" ? providers.data?.find((record) => record.id === id) : undefined;
  const rule =
    action === "recurring-edit" ? rules.data?.find((record) => record.id === id) : undefined;
  const bill = payables.data?.find((record) => record.id === id);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Record<string, string>>();
  const [error, setError] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const queryError = [
    providers.error,
    properties.error,
    jobs.error,
    payables.error,
    rules.error,
    tenancies.error,
    tenants.error,
  ].find(Boolean);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: ctx.org.timezone });
  const allowed = providerForm
    ? canManage(ctx.org.role)
    : canFinance(ctx.org.role) && (action !== "owner-obligation" || ctx.org.role === "owner");
  const loading =
    ((providerForm || billForm) && !providers.data) ||
    (billForm && (!properties.data || !jobs.data)) ||
    (paying && !payables.data) ||
    (recurring && (!rules.data || !tenancies.data || !tenants.data));
  const missing =
    (action === "provider-edit" && !loading && !provider) ||
    (action === "recurring-edit" && !loading && !rule) ||
    (paying && !loading && !bill);

  function input(name: string, label: string, value = "", type = "text", required = true) {
    return (
      <Field label={label}>
        <input
          {...register(name)}
          defaultValue={value}
          type={type}
          required={required}
          step={type === "number" ? "0.01" : undefined}
          min={type === "number" ? "0.01" : undefined}
          maxLength={type === "text" ? 200 : undefined}
        />
      </Field>
    );
  }
  function select(
    name: string,
    label: string,
    options: { id: string; label: string }[],
    value = "",
    required = true,
  ) {
    return (
      <Field label={label}>
        <select {...register(name)} defaultValue={value} required={required}>
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
  async function save(values: Record<string, string>) {
    setError("");
    const text = (field: string) => values[field]?.trim() ?? "";
    const required = (field: string) => {
      const value = text(field);
      if (!value) throw new Error(`Fill in ${field.replaceAll("_", " ")}.`);
      return value;
    };
    try {
      if (providerForm) {
        const body = {
          name: required("name"),
          trade: required("trade"),
          contact_name: text("contact_name"),
          phone: text("phone"),
          email: text("email"),
          address: text("address"),
          notes: text("notes"),
          active: text("active") === "true",
        };
        if (provider)
          await ctx.api.request(`/providers/${id}`, { method: "PUT", body: JSON.stringify(body) });
        else await ctx.api.post("/providers", body);
      } else if (recurring) {
        const body = {
          tenancy_id: rule?.tenancy_id ?? required("tenancy_id"),
          kind: rule?.kind ?? required("kind"),
          description: required("description"),
          amount: parseMoney(required("amount")),
          due_day: Number(required("due_day")),
          start_period: required("start_period"),
          end_period: text("end_period") || null,
          active: text("active") === "true",
        };
        if (rule)
          await ctx.api.request(`/recurring-charges/${id}`, {
            method: "PUT",
            body: JSON.stringify(body),
          });
        else await ctx.api.post("/recurring-charges", body);
      } else if (paying) {
        await ctx.api.post(`/payables/${id}/payments`, {
          amount: parseMoney(required("amount")),
          paid_on: required("paid_on"),
          method: required("method"),
          reference: text("reference"),
          idempotency_key: key,
        });
      } else if (reasonForm) {
        await ctx.api.post(
          action === "payable-void" ? `/payables/${id}/void` : `/outgoing-payments/${id}/reverse`,
          { reason: required("reason") },
        );
      } else if (billForm) {
        const billKind = action === "owner-obligation" ? required("kind") : "service";
        await ctx.api.post("/payables", {
          kind: billKind,
          property_id: text("property_id") || null,
          provider_id: billKind === "service" ? required("provider_id") : null,
          maintenance_id: billKind === "service" ? text("maintenance_id") || null : null,
          description: required("description"),
          amount: parseMoney(required("amount")),
          issued_on: required("issued_on"),
          due_date: required("due_date"),
          reference: text("reference"),
          idempotency_key: key,
        });
      }
      await ctx.refresh();
      close();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not save the record.");
    }
  }
  return (
    <Modal title={titles[action]} close={close}>
      {!allowed ? (
        <ErrorBox message="You do not have permission for this workflow." />
      ) : queryError ? (
        <ErrorBox message={queryError.message} retry={() => void ctx.refresh()} />
      ) : loading ? (
        <Loading />
      ) : missing ? (
        <ErrorBox message="The record is no longer available. Close this form and refresh." />
      ) : (
        <form onSubmit={handleSubmit(save)}>
          <div className="form-body">
            {providerForm && (
              <>
                {input("name", "Provider / company name", provider?.name)}
                {input("trade", "Trade (plumber, electrician, security...)", provider?.trade)}
                {input("contact_name", "Contact person", provider?.contact_name, "text", false)}
                {input("phone", "Phone number", provider?.phone, "tel", false)}
                {input("email", "Email address", provider?.email, "email", false)}
                {input("address", "Address", provider?.address, "text", false)}
                {input(
                  "notes",
                  "Notes (visible to authorized staff)",
                  provider?.notes,
                  "text",
                  false,
                )}
                {select(
                  "active",
                  "Directory status",
                  [
                    { id: "true", label: "Active" },
                    { id: "false", label: "Archived" },
                  ],
                  String(provider?.active ?? true),
                )}
              </>
            )}
            {recurring && (
              <>
                {rule ? (
                  <p>{rule.kind} · Existing tenancy; type and tenancy cannot be changed.</p>
                ) : (
                  <>
                    {select(
                      "tenancy_id",
                      "Tenancy",
                      tenancies.data
                        ?.filter((lease) => lease.status === "active")
                        .map((lease) => ({
                          id: lease.id,
                          label: `${tenants.data?.find((tenant) => tenant.id === lease.tenant_id)?.name ?? lease.reference} · ${lease.reference}`,
                        })) ?? [],
                      action === "recurring-charge" ? id : "",
                    )}
                    {select(
                      "kind",
                      "Charge type",
                      ["water", "garbage", "service"].map((kind) => ({ id: kind, label: kind })),
                      "garbage",
                    )}
                  </>
                )}
                {input("description", "Description", rule?.description)}
                {input(
                  "amount",
                  `Monthly amount (${ctx.org.currency})`,
                  rule ? String(rule.amount / 100) : "",
                  "number",
                )}
                {input("due_day", "Due day (1–31)", String(rule?.due_day ?? 5), "number")}
                {input(
                  "start_period",
                  "First billing month",
                  rule?.start_period ?? ctx.period,
                  "month",
                )}
                {input(
                  "end_period",
                  "Last billing month (optional)",
                  rule?.end_period ?? "",
                  "month",
                  false,
                )}
                {select(
                  "active",
                  "Rule status",
                  [
                    { id: "true", label: "Enabled" },
                    { id: "false", label: "Disabled" },
                  ],
                  String(rule?.active ?? true),
                )}
                <p className="muted">
                  Existing charges stay unchanged. Generate rent & bills for the desired month to
                  create any missing recurring charges. Short months use their last day.
                </p>
              </>
            )}
            {billForm && (
              <>
                {action === "owner-obligation"
                  ? select(
                      "kind",
                      "Category",
                      [
                        { id: "tax", label: "Tax (manual amount)" },
                        { id: "loan", label: "Loan repayment instalment" },
                        { id: "owner_use", label: "Personal / owner use" },
                        { id: "operating", label: "Property operating cost (property required)" },
                      ],
                      "owner_use",
                    )
                  : select(
                      "provider_id",
                      "Service provider",
                      providers.data
                        ?.filter((provider) => provider.active)
                        .map((provider) => ({ id: provider.id, label: provider.name })) ?? [],
                      action === "provider-bill" ? id : "",
                    )}
                {select(
                  "property_id",
                  action === "owner-obligation"
                    ? "Property / source (optional except operating costs)"
                    : "Property",
                  properties.data?.map((property) => ({ id: property.id, label: property.name })) ??
                    [],
                  "",
                  action !== "owner-obligation",
                )}
                {action !== "owner-obligation" &&
                  select(
                    "maintenance_id",
                    "Maintenance job (optional; must match property/provider)",
                    jobs.data?.map((job) => ({
                      id: job.id,
                      label: `${job.title} · ${job.property_name}`,
                    })) ?? [],
                    "",
                    false,
                  )}
                {input("description", "Description")}
                {input("amount", `Amount owed / planned (${ctx.org.currency})`, "", "number")}
                <div className="form-grid">
                  {input("issued_on", "Issue / entry date", today, "date")}
                  {input("due_date", "Due date", today, "date")}
                </div>
                {input("reference", "Invoice / obligation reference", "", "text", false)}
                <p className="muted">
                  This records an amount owed, not a payment. Record outgoing payments separately.
                  Tax and loan entries are manual reminders, not filing, tax calculations or a
                  lender balance.
                </p>
              </>
            )}
            {paying && (
              <>
                <p>
                  {bill?.description} · Outstanding{" "}
                  <strong>{money(bill?.balance ?? 0, ctx.org.currency)}</strong>
                </p>
                {input(
                  "amount",
                  `Amount actually paid (${ctx.org.currency})`,
                  bill ? String(bill.balance / 100) : "",
                  "number",
                )}
                {input("paid_on", "Payment date", today, "date")}
                {select(
                  "method",
                  "Method",
                  ["bank", "mpesa", "cash", "cheque"].map((method) => ({
                    id: method,
                    label: method,
                  })),
                  "bank",
                )}
                {input("reference", "Transaction reference", "", "text", false)}
                <p className="muted">
                  Manual payment history only: no money is transferred and no bank verification
                  occurs. Partial payments are supported.
                </p>
              </>
            )}
            {reasonForm && (
              <>
                {input("reason", "Reason (at least 5 characters)")}
                <p className="muted">
                  History is retained. Reversing an entry does not reverse a bank transfer. Only
                  unpaid bills can be voided.
                </p>
              </>
            )}
            {error && <ErrorBox message={error} />}
          </div>
          <footer className="form-footer">
            <button type="button" className="button secondary" onClick={close}>
              Cancel
            </button>
            <button className="button primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save record"}
            </button>
          </footer>
        </form>
      )}
    </Modal>
  );
}
