import {
  canFinance,
  canMaintain,
  canManage,
  money,
  type OwnerFinances,
  type Payable,
} from "@jojobuilds/api-client";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, TextInput } from "react-native";
import { useAuth } from "../auth";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  Tag,
  styles,
  useRefresh,
  useResource,
} from "../ui";

function openRecord(kind: string, id?: string) {
  router.push({ pathname: "/finance-record", params: { kind, ...(id ? { id } : {}) } });
}

function BillCard({ bill, currency }: { bill: Payable; currency?: string }) {
  const [history, setHistory] = useState(false);
  return (
    <Card>
      <Tag
        text={
          bill.voided_at
            ? "Voided"
            : bill.overdue
              ? "Overdue"
              : bill.balance
                ? "Outstanding"
                : "Paid"
        }
        tone={bill.overdue ? "red" : "neutral"}
      />
      <Text style={styles.heading}>{bill.description}</Text>
      <Text style={styles.muted}>
        {[bill.kind.replaceAll("_", " "), bill.provider_name, bill.property_name, bill.reference]
          .filter(Boolean)
          .join(" · ")}
      </Text>
      <Text style={styles.amount}>{money(bill.balance, currency)}</Text>
      <Text style={styles.muted}>
        Outstanding · Billed {money(bill.amount, currency)} · Paid {money(bill.paid, currency)}
      </Text>
      <Text style={styles.text}>
        Due {bill.due_date} · Last paid {bill.last_paid_on ?? "Never"}
      </Text>
      {bill.void_reason && <Text style={styles.muted}>Voided: {bill.void_reason}</Text>}
      {!bill.voided_at && bill.balance > 0 && (
        <Button
          label="Record outgoing payment"
          onPress={() => openRecord("outgoing-payment", bill.id)}
        />
      )}
      {!bill.voided_at && bill.paid === 0 && (
        <Button
          label="Void incorrect bill"
          secondary
          onPress={() => openRecord("payable-void", bill.id)}
        />
      )}
      <Button
        label={`Payment history (${bill.payments.length})`}
        secondary
        onPress={() => setHistory(!history)}
      />
      {history &&
        bill.payments.map((payment) => (
          <Card key={payment.id}>
            <Text style={styles.text}>
              {money(payment.amount, currency)} · {payment.paid_on}
            </Text>
            <Text style={styles.muted}>
              {payment.method} · {payment.reference || "No reference"}
            </Text>
            {payment.reversed_at ? (
              <Text style={styles.muted}>Reversed: {payment.reversal_reason}</Text>
            ) : (
              <Button
                label="Reverse entry"
                secondary
                onPress={() => openRecord("outgoing-reverse", payment.id)}
              />
            )}
          </Card>
        ))}
    </Card>
  );
}

export default function Finance() {
  const { section = "providers" } = useLocalSearchParams<{ section?: string }>();
  const { org, api } = useAuth();
  const providerPage = section === "providers";
  const billsPage = section === "bills";
  const ownerPage = section === "owner";
  const allowed =
    !!org &&
    (providerPage
      ? canFinance(org.role) || canMaintain(org.role)
      : billsPage
        ? canFinance(org.role)
        : ownerPage && org.role === "owner");
  const financial = !!org && canFinance(org.role);
  const providers = useResource("providers", allowed && providerPage);
  const jobs = useResource("maintenance", allowed && providerPage);
  const payables = useResource("payables", allowed && financial && !billsPage);
  const rules = useResource("recurring-charges", allowed && billsPage);
  const tenancies = useResource("tenancies", allowed && billsPage);
  const tenants = useResource("tenants", allowed && billsPage);
  const [period, setPeriod] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: org?.timezone }).slice(0, 7),
  );
  const [month, setMonth] = useState(period);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useRefresh();
  const summary = useQuery({
    queryKey: [org?.id, "owner-finances", period],
    queryFn: () =>
      api.request<OwnerFinances>(`/owner-finances?period=${encodeURIComponent(period)}`),
    enabled: allowed && ownerPage,
  });
  const queryError = [
    providers.error,
    jobs.error,
    payables.error,
    rules.error,
    tenancies.error,
    tenants.error,
    summary.error,
  ].find(Boolean);
  const loading =
    (providerPage && (!providers.data || !jobs.data)) ||
    (!billsPage && financial && !payables.data) ||
    (billsPage && (!rules.data || !tenancies.data || !tenants.data)) ||
    (ownerPage && !summary.data);
  return (
    <Screen
      title={
        providerPage
          ? "Your service team."
          : billsPage
            ? "Beyond the rent."
            : "Private owner finances."
      }
      onRefresh={refresh}
    >
      <Button label="Back" secondary onPress={() => router.back()} />
      {!allowed ? (
        <ErrorState error="You do not have access to this page." />
      ) : queryError ? (
        <ErrorState error={queryError} retry={refresh} />
      ) : loading ? (
        <LoadingState />
      ) : (
        <>
          {error && <ErrorState error={error} />}
          {notice && (
            <Text accessibilityRole="alert" style={styles.text}>
              {notice}
            </Text>
          )}
          {providerPage && (
            <>
              <Text style={styles.muted}>
                Contacts, jobs, bills and payments. Providers have no login accounts. Financial
                totals cover authorized properties only.
              </Text>
              {org && canManage(org.role) && (
                <Button label="Add service provider" onPress={() => openRecord("provider")} />
              )}
              {!providers.data?.length && <EmptyState title="No service providers yet" />}
              {providers.data?.map((provider) => (
                <Card key={provider.id}>
                  <Text style={styles.heading}>{provider.name}</Text>
                  <Tag text={provider.active ? provider.trade : "Archived"} />
                  <Text style={styles.text}>
                    {provider.contact_name || "No contact person"}
                    {"\n"}
                    {provider.phone || "No phone"}
                    {"\n"}
                    {provider.email || "No email"}
                    {"\n"}
                    {provider.address}
                  </Text>
                  {provider.notes && <Text style={styles.muted}>{provider.notes}</Text>}
                  {jobs.data
                    ?.filter((job) => job.provider_id === provider.id)
                    .map((job) => (
                      <Text key={job.id} style={styles.muted}>
                        Job: {job.title} · {job.property_name} ·{" "}
                        {job.tenant_name ? `${job.tenant_name} / Unit ${job.unit}` : "Common area"}{" "}
                        · {job.status.replaceAll("_", " ")}
                      </Text>
                    ))}
                  {provider.balance !== null && (
                    <>
                      <Text style={styles.amount}>{money(provider.balance, org?.currency)}</Text>
                      <Text style={styles.muted}>
                        Owed · Last paid {provider.last_paid_on ?? "Never"}
                      </Text>
                    </>
                  )}
                  {org && canManage(org.role) && (
                    <Button
                      label="Edit contact / archive"
                      secondary
                      onPress={() => openRecord("provider-edit", provider.id)}
                    />
                  )}
                  {financial && provider.active && (
                    <Button
                      label="Add provider bill"
                      onPress={() => openRecord("provider-bill", provider.id)}
                    />
                  )}
                </Card>
              ))}
            </>
          )}
          {billsPage && (
            <>
              <Button label="Set recurring charge" onPress={() => openRecord("recurring-charge")} />
              <Button
                label="Add variable tenant bill"
                secondary
                onPress={() => openRecord("charge")}
              />
              <Text style={styles.muted}>
                One bill per type, tenancy and month. Editing a rule never changes existing bills.
                Water can be fixed or manually entered, not both in one month.
              </Text>
              <Text style={styles.label}>Billing month (YYYY-MM)</Text>
              <TextInput
                accessibilityLabel="Billing month"
                style={styles.input}
                value={month}
                onChangeText={setMonth}
              />
              <Button
                label={busy ? "Generating..." : "Generate rent & bills"}
                disabled={busy}
                onPress={() => {
                  void (async () => {
                    setError("");
                    setNotice("");
                    setBusy(true);
                    try {
                      if (!/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(month))
                        throw new Error("Enter a valid billing month (YYYY-MM).");
                      const result = await api.post<{
                        created: number;
                        skipped_partial_periods: number;
                      }>("/billing/generate", { period: month });
                      refresh();
                      setNotice(
                        `${result.created} new charges generated. ${result.skipped_partial_periods} partial-period tenancies skipped.`,
                      );
                    } catch (problem) {
                      setError(
                        problem instanceof Error ? problem.message : "Could not generate bills.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              />
              {!rules.data?.length && <EmptyState title="No recurring extra charges" />}
              {rules.data?.map((rule) => {
                const tenancy = tenancies.data?.find((lease) => lease.id === rule.tenancy_id);
                return (
                  <Card key={rule.id}>
                    <Tag text={rule.active ? "Enabled" : "Disabled"} />
                    <Text style={styles.heading}>{rule.description}</Text>
                    <Text style={styles.text}>
                      {tenants.data?.find((tenant) => tenant.id === tenancy?.tenant_id)?.name ??
                        tenancy?.reference}
                    </Text>
                    <Text style={styles.amount}>{money(rule.amount, org?.currency)}</Text>
                    <Text style={styles.muted}>
                      {rule.kind} / month · Due day {rule.due_day} · {rule.start_period} to{" "}
                      {rule.end_period ?? "ongoing"}
                    </Text>
                    <Button
                      label="Edit / disable rule"
                      secondary
                      onPress={() => openRecord("recurring-edit", rule.id)}
                    />
                  </Card>
                );
              })}
            </>
          )}
          {ownerPage && summary.data && (
            <>
              <Text style={styles.muted}>
                Owner-only dashboard. Tax, loan and personal-use entries are private; property
                operating costs are shared with authorized finance staff. No automatic calculations
                or filing.
              </Text>
              <Button
                label="Add obligation / owner use"
                onPress={() => openRecord("owner-obligation")}
              />
              <Text style={styles.label}>Reporting month (YYYY-MM)</Text>
              <TextInput
                accessibilityLabel="Reporting month"
                style={styles.input}
                value={month}
                onChangeText={setMonth}
              />
              <Button
                label="View month"
                secondary
                onPress={() => {
                  if (!/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(month))
                    setError("Enter a valid reporting month (YYYY-MM).");
                  else {
                    setError("");
                    setPeriod(month);
                  }
                }}
              />
              {(
                [
                  ["Recorded inflows (excludes deposits)", summary.data.inflows],
                  ["Providers paid", summary.data.service_paid],
                  ["Operating costs paid", summary.data.operating_paid],
                  ["Taxes paid (manual)", summary.data.tax_paid],
                  ["Loan repayments made", summary.data.loan_paid],
                  ["Personal / owner use paid", summary.data.owner_use_paid],
                  ["Net recorded cash movement", summary.data.net_movement],
                  ["Outstanding bills (all dates)", summary.data.outstanding],
                  ["Overdue bills (all dates)", summary.data.overdue],
                ] as const
              ).map(([label, amount]) => (
                <Card key={label}>
                  <Text style={styles.muted}>{label}</Text>
                  <Text style={styles.amount}>{money(amount, org?.currency)}</Text>
                </Card>
              ))}
              <Text style={styles.muted}>
                Net movement is not a bank balance or profit. Do not enter both an owner withdrawal
                and its subsequent spending. Only outgoing payment records affect this summary;
                maintenance estimates do not.
              </Text>
            </>
          )}
          {!billsPage && financial && (
            <>
              <Text style={styles.heading}>
                {providerPage ? "Service bills & history" : "Obligations & owner use"}
              </Text>
              {!payables.data?.filter((bill) =>
                providerPage ? bill.kind === "service" : bill.kind !== "service",
              ).length && <EmptyState title="No bills recorded" />}
              {payables.data
                ?.filter((bill) =>
                  providerPage ? bill.kind === "service" : bill.kind !== "service",
                )
                .map((bill) => (
                  <BillCard bill={bill} currency={org?.currency} key={bill.id} />
                ))}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
