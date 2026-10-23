import { canFinance, canMaintain, parseMoney, parseOptionalMoney } from "@jojobuilds/api-client";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useAuth } from "../auth";
import { Button, Card, ErrorState, Screen, Tag, styles, useRefresh, useResource } from "../ui";

const transitions: Record<string, string[]> = {
  submitted: ["acknowledged", "assigned"],
  acknowledged: ["assigned", "in_progress"],
  assigned: ["in_progress", "acknowledged"],
  in_progress: ["awaiting_parts", "resolved"],
  awaiting_parts: ["in_progress", "resolved"],
  resolved: ["closed", "in_progress"],
  closed: ["in_progress"],
};

export default function Record() {
  const params = useLocalSearchParams<{ kind: string; id?: string }>();
  const kind = params.kind;
  const { org, api, session } = useAuth();
  const payment = kind === "payment";
  const updating = kind === "maintenance-update";
  const tenants = useResource("tenants", payment && !!org && canFinance(org.role));
  const tenancies = useResource("tenancies", payment && !!org && canFinance(org.role));
  const properties = useResource("properties");
  const maintenance = useResource("maintenance", updating);
  const maintenanceOptions = useResource("maintenance-options", !payment && !updating);
  const providers = useResource("providers", updating);
  const [values, setValues] = useState<Record<string, string>>({});
  const [idempotency] = useState(
    () =>
      `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useRefresh();
  const request = maintenance.data?.find((r) => r.id === params.id);
  const allowed =
    !!session &&
    !!org &&
    (payment ? canFinance(org.role) : updating ? canMaintain(org.role) : org.role !== "tenant");
  function field(key: string, label: string, numeric = false) {
    return (
      <View>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={styles.input}
          accessibilityLabel={label}
          value={values[key] ?? ""}
          onChangeText={(value) => setValues((old) => ({ ...old, [key]: value }))}
          keyboardType={numeric ? "decimal-pad" : "default"}
          autoCapitalize="none"
        />
      </View>
    );
  }
  function picker(key: string, label: string, choices: { id: string; label: string }[]) {
    return (
      <View style={{ gap: 7 }}>
        <Text style={styles.label}>{label}</Text>
        {choices.map((option) => (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{
              checked:
                (values[key] ??
                  (key === "provider_id" ? (request?.provider_id ?? "") : undefined)) === option.id,
            }}
            onPress={() =>
              setValues((old) => ({
                ...old,
                [key]: option.id,
                ...(key === "property_id" ? { tenancy_id: "" } : {}),
              }))
            }
            style={[
              styles.input,
              {
                borderColor:
                  (values[key] ??
                    (key === "provider_id" ? (request?.provider_id ?? "") : undefined)) ===
                  option.id
                    ? "#a44f36"
                    : "#e4e5d9",
              },
            ]}
          >
            <Text style={styles.text}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const required = (key: string) => {
        const value = values[key]?.trim();
        if (!value) throw new Error(`Please fill in ${key.replaceAll("_", " ")}.`);
        return value;
      };
      if (payment) {
        await api.post("/payments", {
          tenancy_id: required("tenancy_id"),
          amount: parseMoney(required("amount")),
          received_on:
            values.date?.trim() ||
            new Date().toLocaleDateString("en-CA", { timeZone: org?.timezone }),
          method: required("method"),
          reference: values.reference?.trim() || "",
          idempotency_key: idempotency,
        });
      } else if (updating) {
        await api.post(`/maintenance/${params.id}`, {
          status: required("status"),
          note: required("note"),
          assigned_to: values.assigned_to?.trim() || request?.assigned_to || "",
          provider_id:
            values.provider_id === "" ? null : (values.provider_id ?? request?.provider_id ?? null),
          ...(org?.role === "manager"
            ? {}
            : { cost: parseOptionalMoney(values.cost ?? "", request?.cost ?? 0) }),
        });
      } else {
        await api.post("/maintenance", {
          property_id: required("property_id"),
          tenancy_id: values.tenancy_id || null,
          title: required("title"),
          description: required("description"),
          priority: values.priority || "normal",
          category: "General",
        });
      }
      refresh();
      router.back();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  const queryError = [
    tenants.error,
    tenancies.error,
    properties.error,
    maintenance.error,
    maintenanceOptions.error,
    providers.error,
  ].find(Boolean);
  return (
    <Screen
      title={payment ? "Record a payment." : updating ? "Move things forward." : "Report an issue."}
    >
      {!allowed ? (
        <ErrorState error="You do not have access to this workflow." />
      ) : (
        <Card>
          {(error || queryError) && <ErrorState error={error || queryError!} />}
          {payment ? (
            <>
              <Text style={styles.muted}>
                Manual entry, not independent bank verification. Repeated taps and retries reuse the
                same idempotency key.
              </Text>
              {picker(
                "tenancy_id",
                "Tenancy",
                tenancies.data?.map((lease) => ({
                  id: lease.id,
                  label: `${tenants.data?.find((t) => t.id === lease.tenant_id)?.name ?? lease.reference} · ${lease.reference}`,
                })) ?? [],
              )}
              {field("amount", `Amount received (${org?.currency})`, true)}
              {field("date", "Date received (YYYY-MM-DD; leave blank for today)")}
              {picker(
                "method",
                "Method",
                ["bank", "mpesa", "cash", "cheque"].map((method) => ({
                  id: method,
                  label: method === "mpesa" ? "M-Pesa (manual)" : method,
                })),
              )}
              {field("reference", "Transaction reference (optional)")}
            </>
          ) : updating ? (
            <>
              <Text style={styles.heading}>{request?.title}</Text>
              <Text style={styles.muted}>
                {request?.tenant_name
                  ? `${request.tenant_name} · Unit ${request.unit}`
                  : "Common area"}{" "}
                · {request?.property_name}
              </Text>
              <Tag text={request?.status.replaceAll("_", " ") ?? "Loading status"} />
              {picker(
                "status",
                "Next status",
                (request ? transitions[request.status] : []).map((status) => ({
                  id: status,
                  label: status.replaceAll("_", " "),
                })),
              )}
              {field("note", "Tenant-visible update")}
              {field("assigned_to", "Assigned worker (optional)")}
              {picker("provider_id", "Registered service provider", [
                { id: "", label: "Other worker / no registered provider" },
                ...(providers.data
                  ?.filter((provider) => provider.active || provider.id === request?.provider_id)
                  .map((provider) => ({
                    id: provider.id,
                    label: `${provider.name} · ${provider.trade}`,
                  })) ?? []),
              ])}
              {org?.role !== "manager" &&
                field("cost", `Total recorded cost (${org?.currency}, optional)`, true)}
              <Text style={styles.muted}>
                Recorded cost is not a payment. Record a provider bill and outgoing payment in
                Service providers.
              </Text>
            </>
          ) : (
            <>
              {picker(
                "property_id",
                "Property",
                properties.data?.map((p) => ({ id: p.id, label: p.name })) ?? [],
              )}
              {picker("tenancy_id", "Tenant / unit (optional for common areas)", [
                { id: "", label: "Common area / no tenant linked" },
                ...(maintenanceOptions.data
                  ?.filter(
                    (option) => !values.property_id || option.property_id === values.property_id,
                  )
                  .map((option) => ({
                    id: option.id,
                    label: `${option.tenant_name} · ${option.property_name} · Unit ${option.unit}`,
                  })) ?? []),
              ])}
              {field("title", "Short title")}
              {field("description", "Describe the problem")}
              {picker(
                "priority",
                "Priority",
                ["low", "normal", "high", "urgent"].map((priority) => ({
                  id: priority,
                  label: priority,
                })),
              )}
            </>
          )}
          <Button
            label={busy ? "Saving..." : "Save to JOJOBUILDS"}
            disabled={busy || !!queryError}
            onPress={() => void save()}
          />
          <Button label="Cancel" secondary onPress={() => router.back()} />
        </Card>
      )}
    </Screen>
  );
}
