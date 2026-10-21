import { canFinance, money } from "@jojobuilds/api-client";
import { useState } from "react";
import { Text, View } from "react-native";
import { useAuth } from "../../auth";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  SearchField,
  Tag,
  styles,
  useRefresh,
  useResource,
} from "../../ui";

export default function Tenants() {
  const { org } = useAuth();
  const permitted = !!org && ["owner", "manager", "agent", "finance"].includes(org.role);
  const tenants = useResource("tenants", permitted);
  const tenancies = useResource("tenancies", permitted);
  const units = useResource("units", permitted);
  const charges = useResource("charges", !!org && canFinance(org.role));
  const [search, setSearch] = useState("");
  const refresh = useRefresh();
  const error = [tenants.error, tenancies.error, units.error, charges.error].find(Boolean);
  return (
    <Screen
      title="The people in your properties."
      subtitle="Tenancy details and account status."
      onRefresh={refresh}
    >
      {!permitted ? (
        <ErrorState error="Your role does not have access to tenant accounts." />
      ) : (
        <>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search tenant name or contact"
          />
          {error ? (
            <ErrorState error={error} retry={refresh} />
          ) : !tenants.data || !tenancies.data || !units.data ? (
            <LoadingState />
          ) : !tenants.data.length ? (
            <EmptyState title="No tenants yet" />
          ) : (
            tenants.data
              .filter((t) =>
                `${t.name} ${t.phone} ${t.email}`.toLowerCase().includes(search.toLowerCase()),
              )
              .map((person) => {
                const leases = tenancies.data.filter((t) => t.tenant_id === person.id);
                const active = leases.find((t) => t.status === "active");
                const unit = units.data.find((u) => u.id === active?.unit_id);
                const balance = charges.data
                  ?.filter((c) => leases.some((l) => l.id === c.tenancy_id) && c.kind !== "deposit")
                  .reduce((sum, c) => sum + c.balance, 0);
                return (
                  <Card key={person.id}>
                    <View style={styles.row}>
                      <Text style={styles.heading}>{person.name}</Text>
                      <Tag
                        text={active ? "Active tenancy" : "No active tenancy"}
                        tone={active ? "green" : "neutral"}
                      />
                    </View>
                    <Text style={styles.muted}>
                      {unit ? `${unit.building} · ${unit.number}` : "Unassigned"} ·{" "}
                      {active?.reference ?? "No reference"}
                    </Text>
                    {person.email ? <Text style={styles.text}>{person.email}</Text> : null}
                    {person.phone ? <Text style={styles.text}>{person.phone}</Text> : null}
                    {active && (
                      <Text style={styles.text}>
                        Monthly rent: {money(active.rent, org?.currency)}
                      </Text>
                    )}
                    {balance !== undefined && (
                      <Text style={styles.text}>
                        Outstanding charges: {money(balance, org?.currency)}
                      </Text>
                    )}
                    <Text style={styles.muted}>
                      {leases.length} recorded tenancy / tenancies. Identity documents are not
                      displayed or cached.
                    </Text>
                  </Card>
                );
              })
          )}
        </>
      )}
    </Screen>
  );
}
