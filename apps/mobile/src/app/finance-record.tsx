import { canFinance, canManage, parseMoney } from "@jojobuilds/api-client";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useAuth } from "../auth";
import {
  Button,
  Card,
  ErrorState,
  LoadingState,
  Screen,
  styles,
  useRefresh,
  useResource,
} from "../ui";

export default function FinanceRecord() {
  const { kind = "", id = "" } = useLocalSearchParams<{ kind: string; id?: string }>();
  const { org, api } = useAuth();
  const providerForm = kind === "provider" || kind === "provider-edit";
  const recurring = kind === "recurring-charge" || kind === "recurring-edit";
  const billForm = kind === "provider-bill" || kind === "owner-obligation";
  const paying = kind === "outgoing-payment";
  const reasonForm = kind === "outgoing-reverse" || kind === "payable-void";
  const charge = kind === "charge";
  const allowed =
    !!org &&
    (providerForm
      ? canManage(org.role)
      : canFinance(org.role) && (kind !== "owner-obligation" || org.role === "owner")) &&
    (providerForm || recurring || billForm || paying || reasonForm || charge);
  const providers = useResource("providers", allowed && (providerForm || kind === "provider-bill"));
  const properties = useResource("properties", allowed && billForm);
  const jobs = useResource("maintenance", allowed && kind === "provider-bill");
  const payables = useResource("payables", allowed && paying);
  const rules = useResource("recurring-charges", allowed && recurring);
  const tenancies = useResource("tenancies", allowed && (recurring || charge));
  const tenants = useResource("tenants", allowed && (recurring || charge));
  const provider = providers.data?.find((provider) => provider.id === id);
  const rule = rules.data?.find((rule) => rule.id === id);
  const bill = payables.data?.find((bill) => bill.id === id);
  const [values, setValues] = useState<Record<string, string>>({});
  const [key] = useState(
    () =>
      `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useRefresh();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: org?.timezone });
  const defaults: Record<string, string> = providerForm
    ? {
        name: provider?.name ?? "",
        trade: provider?.trade ?? "",
        contact_name: provider?.contact_name ?? "",
        phone: provider?.phone ?? "",
        email: provider?.email ?? "",
        address: provider?.address ?? "",
        notes: provider?.notes ?? "",
        active: String(provider?.active ?? true),
      }
    : recurring
      ? {
          tenancy_id: rule?.tenancy_id ?? "",
          kind: rule?.kind ?? "garbage",
          description: rule?.description ?? "",
          amount: rule ? String(rule.amount / 100) : "",
          due_day: String(rule?.due_day ?? 5),
          start_period: rule?.start_period ?? today.slice(0, 7),
          end_period: rule?.end_period ?? "",
          active: String(rule?.active ?? true),
        }
      : {
          provider_id: kind === "provider-bill" ? id : "",
          kind: charge ? "water" : "owner_use",
          amount: bill ? String(bill.balance / 100) : "",
          issued_on: today,
          due_date: today,
          paid_on: today,
          period: today.slice(0, 7),
          method: "bank",
        };
  const read = (field: string) => (values[field] ?? defaults[field] ?? "").trim();
  function field(name: string, label: string, numeric = false) {
    return (
      <View>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={styles.input}
          accessibilityLabel={label}
          value={values[name] ?? defaults[name] ?? ""}
          autoCapitalize="none"
          keyboardType={numeric ? "decimal-pad" : "default"}
          onChangeText={(value) => setValues((old) => ({ ...old, [name]: value }))}
        />
      </View>
    );
  }
  function choice(name: string, label: string, options: { id: string; label: string }[]) {
    return (
      <View style={{ gap: 7 }}>
        <Text style={styles.label}>{label}</Text>
        {options.map((option) => (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: read(name) === option.id }}
            onPress={() => setValues((old) => ({ ...old, [name]: option.id }))}
            style={[
              styles.input,
              { borderColor: read(name) === option.id ? "#a44f36" : "#e4e5d9" },
            ]}
          >
            <Text style={styles.text}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  }
  const queryError = [
    providers.error,
    properties.error,
    jobs.error,
    payables.error,
    rules.error,
    tenancies.error,
    tenants.error,
  ].find(Boolean);
  const loading =
    ((providerForm || kind === "provider-bill") && !providers.data) ||
    (billForm && !properties.data) ||
    (kind === "provider-bill" && !jobs.data) ||
    (paying && !payables.data) ||
    ((recurring || charge) && (!tenancies.data || !tenants.data)) ||
    (recurring && !rules.data);
  const missing =
    (kind === "provider-edit" && !loading && !provider) ||
    (kind === "recurring-edit" && !loading && !rule) ||
    (paying && !loading && !bill);
  async function save() {
    setBusy(true);
    setError("");
    try {
      const required = (field: string) => {
        const value = read(field);
        if (!value) throw new Error(`Please fill in ${field.replaceAll("_", " ")}.`);
        return value;
      };
      if (providerForm) {
        const body = {
          name: required("name"),
          trade: required("trade"),
          contact_name: read("contact_name"),
          phone: read("phone"),
          email: read("email"),
          address: read("address"),
          notes: read("notes"),
          active: read("active") === "true",
        };
        if (kind === "provider-edit")
          await api.request(`/providers/${id}`, { method: "PUT", body: JSON.stringify(body) });
        else await api.post("/providers", body);
      } else if (recurring) {
        const body = {
          tenancy_id: required("tenancy_id"),
          kind: required("kind"),
          description: required("description"),
          amount: parseMoney(required("amount")),
          due_day: Number(required("due_day")),
          start_period: required("start_period"),
          end_period: read("end_period") || null,
          active: read("active") === "true",
        };
        if (kind === "recurring-edit")
          await api.request(`/recurring-charges/${id}`, {
            method: "PUT",
            body: JSON.stringify(body),
          });
        else await api.post("/recurring-charges", body);
      } else if (billForm) {
        await api.post("/payables", {
          kind: kind === "provider-bill" ? "service" : required("kind"),
          property_id: read("property_id") || null,
          provider_id: kind === "provider-bill" ? required("provider_id") : null,
          maintenance_id: kind === "provider-bill" ? read("maintenance_id") || null : null,
          description: required("description"),
          amount: parseMoney(required("amount")),
          issued_on: required("issued_on"),
          due_date: required("due_date"),
          reference: read("reference"),
          idempotency_key: key,
        });
      } else if (paying) {
        await api.post(`/payables/${id}/payments`, {
          amount: parseMoney(required("amount")),
          paid_on: required("paid_on"),
          method: required("method"),
          reference: read("reference"),
          idempotency_key: key,
        });
      } else if (reasonForm) {
        await api.post(
          kind === "payable-void" ? `/payables/${id}/void` : `/outgoing-payments/${id}/reverse`,
          { reason: required("reason") },
        );
      } else if (charge) {
        await api.post("/charges", {
          tenancy_id: required("tenancy_id"),
          kind: required("kind"),
          description: required("description"),
          amount: parseMoney(required("amount")),
          period: required("period"),
          due_date: required("due_date"),
        });
      }
      refresh();
      router.back();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not save record.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title={kind.replaceAll("-", " ") + "."}>
      {!allowed ? (
        <ErrorState error="You do not have access to this workflow." />
      ) : queryError ? (
        <ErrorState error={queryError} retry={refresh} />
      ) : loading ? (
        <LoadingState />
      ) : missing ? (
        <ErrorState error="Record not found. Go back and refresh." />
      ) : (
        <Card>
          {error && <ErrorState error={error} />}
          {providerForm && (
            <>
              {field("name", "Provider / company name")}
              {field("trade", "Trade")}
              {field("contact_name", "Contact person")}
              {field("phone", "Phone number")}
              {field("email", "Email address")}
              {field("address", "Address")}
              {field("notes", "Staff-visible notes")}
              {choice("active", "Status", [
                { id: "true", label: "Active" },
                { id: "false", label: "Archived" },
              ])}
            </>
          )}
          {(recurring || charge) && (
            <>
              {rule ? (
                <Text style={styles.text}>
                  Existing {rule.kind} rule; tenancy and type cannot change.
                </Text>
              ) : (
                <>
                  {choice(
                    "tenancy_id",
                    "Tenancy",
                    tenancies.data
                      ?.filter((lease) => lease.status === "active")
                      .map((lease) => ({
                        id: lease.id,
                        label: `${tenants.data?.find((tenant) => tenant.id === lease.tenant_id)?.name ?? lease.reference} · ${lease.reference}`,
                      })) ?? [],
                  )}
                  {choice(
                    "kind",
                    "Charge type",
                    ["water", "garbage", "service"].map((kind) => ({ id: kind, label: kind })),
                  )}
                </>
              )}
              {field("description", "Description")}
              {field("amount", `Amount (${org?.currency})`, true)}
              {recurring ? (
                <>
                  {field("due_day", "Due day (1–31)", true)}
                  {field("start_period", "First billing month (YYYY-MM)")}
                  {field("end_period", "Last billing month (optional, YYYY-MM)")}
                  {choice("active", "Rule status", [
                    { id: "true", label: "Enabled" },
                    { id: "false", label: "Disabled" },
                  ])}
                </>
              ) : (
                <>
                  {field("period", "Billing month (YYYY-MM)")}
                  {field("due_date", "Due date (YYYY-MM-DD)")}
                </>
              )}
              <Text style={styles.muted}>
                One charge per type and month. Rules affect future generated bills only; existing
                bills remain unchanged.
              </Text>
            </>
          )}
          {billForm && (
            <>
              {kind === "owner-obligation"
                ? choice("kind", "Category", [
                    { id: "owner_use", label: "Personal / owner use" },
                    { id: "tax", label: "Tax (manual)" },
                    { id: "loan", label: "Loan instalment" },
                    { id: "operating", label: "Property operating cost (property required)" },
                  ])
                : choice(
                    "provider_id",
                    "Service provider",
                    providers.data
                      ?.filter((provider) => provider.active)
                      .map((provider) => ({ id: provider.id, label: provider.name })) ?? [],
                  )}
              {choice("property_id", "Property / source", [
                ...(kind === "owner-obligation"
                  ? [{ id: "", label: "Not property-specific (not for operating costs)" }]
                  : []),
                ...(properties.data?.map((property) => ({
                  id: property.id,
                  label: property.name,
                })) ?? []),
              ])}
              {kind === "provider-bill" &&
                choice("maintenance_id", "Maintenance job (must match property/provider)", [
                  { id: "", label: "No linked job" },
                  ...(jobs.data?.map((job) => ({
                    id: job.id,
                    label: `${job.title} · ${job.property_name}`,
                  })) ?? []),
                ])}
              {field("description", "Description")}
              {field("amount", `Amount owed / planned (${org?.currency})`, true)}
              {field("issued_on", "Issue / entry date (YYYY-MM-DD)")}
              {field("due_date", "Due date (YYYY-MM-DD)")}
              {field("reference", "Invoice / obligation reference (optional)")}
              <Text style={styles.muted}>
                This is an obligation, not a payment. Record payments separately. Taxes and loan
                instalments are manual amounts, not automatic calculations or filing.
              </Text>
            </>
          )}
          {paying && (
            <>
              <Text style={styles.heading}>{bill?.description}</Text>
              {field("amount", `Amount actually paid (${org?.currency})`, true)}
              {field("paid_on", "Payment date (YYYY-MM-DD)")}
              {choice(
                "method",
                "Method",
                ["bank", "mpesa", "cash", "cheque"].map((method) => ({
                  id: method,
                  label: method,
                })),
              )}
              {field("reference", "Transaction reference (optional)")}
              <Text style={styles.muted}>
                Record a payment already made. This does not send money or verify a bank transfer.
              </Text>
            </>
          )}
          {reasonForm && (
            <>
              {field("reason", "Reason (at least 5 characters)")}
              <Text style={styles.muted}>
                History is preserved. Reversing a record does not reverse a bank transfer. Only
                unpaid bills can be voided.
              </Text>
            </>
          )}
          <Button
            label={busy ? "Saving..." : "Save record"}
            disabled={busy}
            onPress={() => void save()}
          />
        </Card>
      )}
      <Button label="Cancel / back" secondary onPress={() => router.back()} />
    </Screen>
  );
}
