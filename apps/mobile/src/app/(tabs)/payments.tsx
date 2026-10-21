import { canFinance, money } from "@jojobuilds/api-client";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import { useAuth, WEB_URL } from "../../auth";
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

export default function Payments() {
  const { api, org } = useAuth();
  const permitted = !!org && canFinance(org.role);
  const payments = useResource("payments", permitted);
  const reconciliation = useResource("reconciliation", permitted);
  const tenancies = useResource("tenancies", permitted);
  const tenants = useResource("tenants", permitted);
  const imports = useResource("imports", permitted);
  const [section, setSection] = useState<"payments" | "review">("review");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const refresh = useRefresh();
  const firstError = [
    payments.error,
    reconciliation.error,
    tenancies.error,
    tenants.error,
    imports.error,
  ].find(Boolean);
  async function confirm(id: string, tenancyId: string) {
    setBusy(id);
    setError("");
    try {
      await api.post(`/reconciliation/${id}`, {
        action: "confirm",
        tenancy_id: tenancyId,
        reason: "Reviewed source statement and exact tenancy reference on mobile",
      });
      refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Payment confirmation failed.");
    } finally {
      setBusy("");
    }
  }
  return (
    <Screen
      title="Rent & collections."
      subtitle="Recorded receipts and a review inbox you control."
      onRefresh={refresh}
      refreshing={reconciliation.isRefetching}
    >
      {!permitted ? (
        <ErrorState error="Your role cannot access financial records." />
      ) : (
        <>
          <View style={styles.metrics}>
            <View style={{ flex: 1 }}>
              <Button
                label="Review inbox"
                secondary={section !== "review"}
                onPress={() => setSection("review")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Payments"
                secondary={section !== "payments"}
                onPress={() => setSection("payments")}
              />
            </View>
          </View>
          <Button
            label="Record manual payment"
            onPress={() => router.push("/record?kind=payment")}
          />
          {error && <ErrorState error={error} />}
          {firstError ? (
            <ErrorState error={firstError} retry={refresh} />
          ) : !payments.data || !reconciliation.data || !tenancies.data || !tenants.data ? (
            <LoadingState />
          ) : section === "review" ? (
            <>
              <Card>
                <Text style={styles.heading}>Review, then confirm.</Text>
                <Text style={styles.muted}>
                  Only an exact unique reference can be approved here. Use the website for ambiguous
                  matches, duplicate review, file mapping or bulk corrections.
                </Text>
                <Button
                  label="Import & complex review on website"
                  secondary
                  onPress={() => {
                    void Linking.openURL(WEB_URL).catch((problem: unknown) =>
                      setError(
                        problem instanceof Error ? problem.message : "Could not open website.",
                      ),
                    );
                  }}
                />
              </Card>
              {!reconciliation.data.length ? (
                <EmptyState title="Your review inbox is clear" />
              ) : (
                reconciliation.data.map((row) => {
                  const suggestion = row.suggestions.length === 1 ? row.suggestions[0] : null;
                  const lease = tenancies.data.find((t) => t.id === suggestion?.tenancy_id);
                  const tenant = tenants.data.find((t) => t.id === lease?.tenant_id);
                  return (
                    <Card key={row.id}>
                      <View style={styles.row}>
                        <Text style={styles.heading}>{money(row.amount, org?.currency)}</Text>
                        <Tag
                          text={
                            row.status === "duplicate_review"
                              ? "Possible duplicate"
                              : suggestion
                                ? "Reference match"
                                : "Ambiguous"
                          }
                          tone={
                            row.status === "duplicate_review"
                              ? "red"
                              : suggestion
                                ? "green"
                                : "neutral"
                          }
                        />
                      </View>
                      <Text style={styles.text}>{row.description}</Text>
                      <Text style={styles.muted}>
                        {row.reference} · {row.date}
                      </Text>
                      {tenant && (
                        <Text style={styles.text}>
                          Suggested: {tenant.name} · {lease?.reference}
                        </Text>
                      )}
                      {suggestion && row.status !== "duplicate_review" && (
                        <Button
                          label={busy === row.id ? "Confirming..." : "Review & confirm payment"}
                          disabled={!!busy}
                          onPress={() =>
                            Alert.alert(
                              "Confirm recorded payment?",
                              `Verify ${money(row.amount, org?.currency)} belongs to ${tenant?.name ?? lease?.reference}. This will post and allocate the payment.`,
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Confirm",
                                  onPress: () => void confirm(row.id, suggestion.tenancy_id),
                                },
                              ],
                            )
                          }
                        />
                      )}
                    </Card>
                  );
                })
              )}
              {!!imports.data?.length && (
                <Card>
                  <Text style={styles.heading}>Recent statement imports</Text>
                  {imports.data.slice(0, 5).map((batch) => (
                    <Text key={batch.id} style={styles.muted}>
                      {batch.filename} · {new Date(batch.created_at).toLocaleDateString("en-KE")}
                    </Text>
                  ))}
                </Card>
              )}
            </>
          ) : (
            payments.data.map((p) => (
              <Card key={p.id}>
                <View style={styles.row}>
                  <Text style={styles.heading}>{p.tenant}</Text>
                  <Tag
                    text={p.reversed_at ? "Reversed" : "Recorded"}
                    tone={p.reversed_at ? "red" : "green"}
                  />
                </View>
                <Text style={styles.text}>{money(p.amount, p.currency)}</Text>
                <Text style={styles.muted}>
                  {p.property_name} · {p.unit} · {p.received_on}
                </Text>
                <Text style={styles.muted}>
                  {p.reference || "No reference"} ·{" "}
                  {p.provenance === "statement_import" ? "Statement imported" : "Manually recorded"}
                </Text>
                <Text style={styles.muted}>
                  Allocated: {money(p.allocated, p.currency)}. Printable acknowledgements and
                  reversals are available on the website.
                </Text>
              </Card>
            ))
          )}
        </>
      )}
    </Screen>
  );
}
