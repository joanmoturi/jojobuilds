import { canFinance, money } from "@jojobuilds/api-client";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "../../auth";
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
} from "../../ui";

export default function Overview() {
  const { api, org } = useAuth();
  const finance = !!org && canFinance(org.role);
  const period = new Date()
    .toLocaleDateString("en-CA", { timeZone: org?.timezone || "Africa/Nairobi" })
    .slice(0, 7);
  const summary = useQuery({
    queryKey: [org?.id, "dashboard", period],
    queryFn: () => api.dashboard(period),
    enabled: finance,
  });
  const payments = useResource("payments", finance);
  const maintenance = useResource("maintenance");
  const refresh = useRefresh();
  if (!finance)
    return (
      <Screen
        title="Your daily overview"
        subtitle="Property operations at a glance."
        onRefresh={refresh}
      >
        <Button label="View assigned properties" onPress={() => router.push("/properties")} />
        <Button
          label="Maintenance & notifications"
          secondary
          onPress={() => router.push("/more")}
        />
        {maintenance.error ? (
          <ErrorState error={maintenance.error} retry={refresh} />
        ) : (
          <Card>
            <Text style={styles.heading}>
              {maintenance.data?.filter((r) => !["closed", "resolved"].includes(r.status)).length ??
                "..."}{" "}
              requests need attention
            </Text>
          </Card>
        )}
      </Screen>
    );
  const s = summary.data;
  return (
    <Screen
      title="Your portfolio, at a glance."
      subtitle={`Rent & collections · ${period}`}
      refreshing={summary.isRefetching}
      onRefresh={refresh}
    >
      {summary.error || payments.error ? (
        <ErrorState error={summary.error ?? payments.error!} retry={refresh} />
      ) : !s || !payments.data ? (
        <LoadingState />
      ) : (
        <>
          <Card>
            <View style={styles.row}>
              <Text style={styles.eyebrow}>RENT ALLOCATED</Text>
              <Tag
                text={`${s.billed ? Math.round((s.allocated / s.billed) * 100) : 0}% collected`}
                tone="green"
              />
            </View>
            <Text style={styles.amount}>{money(s.allocated, s.currency)}</Text>
            <Text style={styles.muted}>of {money(s.billed, s.currency)} billed in this period</Text>
            <View style={styles.separator} />
            <View style={styles.row}>
              <Text style={styles.muted}>Overdue balance</Text>
              <Text style={[styles.text, { color: "#bd534c" }]}>
                {money(s.overdue, s.currency)}
              </Text>
            </View>
          </Card>
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.eyebrow}>OCCUPANCY</Text>
              <Text style={styles.title}>
                {s.units ? Math.round((s.occupied / s.units) * 100) : 0}%
              </Text>
              <Text style={styles.muted}>
                {s.occupied} / {s.units} units occupied
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.eyebrow}>REVIEW INBOX</Text>
              <Text style={styles.title}>{s.pending_review}</Text>
              <Text style={styles.muted}>Transactions awaiting review</Text>
            </View>
          </View>
          <Button label="Record payment" onPress={() => router.push("/record?kind=payment")} />
          {s.statement_refresh_due && (
            <Card>
              <Text style={styles.heading}>Time for a fresh statement?</Text>
              <Text style={styles.muted}>
                The three-day reminder checks freshness, not bank connectivity. Nothing is fetched
                automatically.
              </Text>
              <Button
                label="Open payment review"
                secondary
                onPress={() => router.push("/payments")}
              />
            </Card>
          )}
          <Text style={styles.heading}>Recent recorded payments</Text>
          {!payments.data.length ? (
            <EmptyState
              title="No payments recorded"
              message="Record or reconcile a receipt to see it here."
            />
          ) : (
            payments.data.slice(0, 5).map((p) => (
              <Card key={p.id}>
                <View style={styles.row}>
                  <Text style={styles.heading}>{p.tenant}</Text>
                  <Tag
                    text={p.reversed_at ? "Reversed" : "Recorded"}
                    tone={p.reversed_at ? "red" : "green"}
                  />
                </View>
                <Text style={styles.muted}>
                  {p.property_name} · {p.unit}
                </Text>
                <Text style={styles.heading}>{money(p.amount, p.currency)}</Text>
                <Text style={styles.muted}>
                  {p.received_on} ·{" "}
                  {p.provenance === "statement_import" ? "Statement imported" : "Manually recorded"}
                </Text>
              </Card>
            ))
          )}
          <Text style={styles.muted}>
            Cash received this period: {money(s.cash_received, s.currency)}. This can differ from
            rent allocated to the period.
          </Text>
        </>
      )}
    </Screen>
  );
}
