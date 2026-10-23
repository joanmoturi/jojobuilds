import { canFinance, canMaintain, money } from "@jojobuilds/api-client";
import { router } from "expo-router";
import { useState } from "react";
import { Linking, Text, View } from "react-native";
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

export default function More() {
  const { api, org, session, logout, selectOrg } = useAuth();
  const maintenance = useResource("maintenance");
  const notifications = useResource("notifications");
  const [section, setSection] = useState<"maintenance" | "notifications" | "settings">(
    "maintenance",
  );
  const [error, setError] = useState("");
  const refresh = useRefresh();
  return (
    <Screen title="Everything else, in reach." onRefresh={refresh}>
      {org && (
        <Button
          label="Property messages & tenant balances"
          secondary
          onPress={() => router.push("/messages")}
        />
      )}
      {org && (canFinance(org.role) || canMaintain(org.role)) && (
        <Button
          label="Service providers & bills"
          secondary
          onPress={() => router.push({ pathname: "/finance", params: { section: "providers" } })}
        />
      )}
      {org && canFinance(org.role) && (
        <Button
          label="Recurring & variable tenant bills"
          secondary
          onPress={() => router.push({ pathname: "/finance", params: { section: "bills" } })}
        />
      )}
      {org?.role === "owner" && (
        <Button
          label="Private owner finances"
          secondary
          onPress={() => router.push({ pathname: "/finance", params: { section: "owner" } })}
        />
      )}
      <View style={styles.metrics}>
        {(["maintenance", "notifications", "settings"] as const).map((tab) => (
          <View key={tab} style={{ flex: 1 }}>
            <Button
              label={tab[0].toUpperCase() + tab.slice(1)}
              secondary={section !== tab}
              onPress={() => setSection(tab)}
            />
          </View>
        ))}
      </View>
      {error && <ErrorState error={error} />}
      {section === "maintenance" ? (
        <>
          <Button
            label="New maintenance request"
            onPress={() => router.push("/record?kind=maintenance")}
          />
          {maintenance.error ? (
            <ErrorState error={maintenance.error} retry={refresh} />
          ) : !maintenance.data ? (
            <LoadingState />
          ) : !maintenance.data.length ? (
            <EmptyState title="No maintenance requests" />
          ) : (
            maintenance.data.map((r) => (
              <Card key={r.id}>
                <View style={styles.row}>
                  <Text style={[styles.heading, { flex: 1 }]}>{r.title}</Text>
                  <Tag text={r.priority} tone={r.priority === "urgent" ? "red" : "neutral"} />
                </View>
                <Text style={styles.text}>{r.description}</Text>
                <Text style={styles.muted}>
                  {r.property_name} ·{" "}
                  {r.tenant_name
                    ? `${r.tenant_name} · Unit ${r.unit}`
                    : "Common area / no tenant linked"}
                </Text>
                <Tag
                  text={r.status.replaceAll("_", " ")}
                  tone={["resolved", "closed"].includes(r.status) ? "green" : "neutral"}
                />
                <Text style={styles.muted}>
                  Assigned to: {r.assigned_to || "Awaiting assignment"}
                </Text>
                {r.provider_id && (
                  <Text style={styles.muted}>Provider response: {r.provider_response}</Text>
                )}
                {r.provider_note && (
                  <Text style={styles.muted}>Private provider response: {r.provider_note}</Text>
                )}
                {r.cost !== null && (
                  <Text style={styles.muted}>Recorded cost: {money(r.cost, org?.currency)}</Text>
                )}
                {r.updates.slice(-2).map((update) => (
                  <Text style={styles.muted} key={update.at}>
                    {update.status}: {update.note}
                  </Text>
                ))}
                {org && canMaintain(org.role) && (
                  <Button
                    label="Update request"
                    secondary
                    onPress={() =>
                      router.push({
                        pathname: "/record",
                        params: { kind: "maintenance-update", id: r.id },
                      })
                    }
                  />
                )}
              </Card>
            ))
          )}
        </>
      ) : section === "notifications" ? (
        notifications.error ? (
          <ErrorState error={notifications.error} retry={refresh} />
        ) : !notifications.data ? (
          <LoadingState />
        ) : !notifications.data.length ? (
          <EmptyState title="You’re all caught up" />
        ) : (
          notifications.data.map((n) => (
            <Card key={n.id}>
              <Text style={styles.heading}>{n.title}</Text>
              <Text style={styles.text}>{n.body}</Text>
              <Text style={styles.muted}>{new Date(n.created_at).toLocaleString("en-KE")}</Text>
              {!n.read && (
                <Button
                  label="Mark as read"
                  secondary
                  onPress={() => {
                    void api
                      .post(`/notifications/${n.id}/read`, {})
                      .then(refresh)
                      .catch((problem: unknown) =>
                        setError(
                          problem instanceof Error
                            ? problem.message
                            : "Could not update notification.",
                        ),
                      );
                  }}
                />
              )}
            </Card>
          ))
        )
      ) : (
        <>
          <Card>
            <Text style={styles.heading}>{session?.name}</Text>
            <Text style={styles.text}>{session?.email}</Text>
            <Text style={styles.muted}>
              {org?.role} · {org?.currency} · {org?.timezone}
            </Text>
            <Text style={styles.muted}>
              Changing workspace clears in-memory cached data. No financial data is persisted on
              this device.
            </Text>
          </Card>
          {session?.organizations.map((item) => (
            <Button
              key={item.id}
              label={`${item.name}${item.id === org?.id ? " (selected)" : ""}`}
              secondary={item.id !== org?.id}
              onPress={() => selectOrg(item.id)}
            />
          ))}
          <Card>
            <Text style={styles.heading}>Honest connection status</Text>
            <Text style={styles.muted}>
              Bank feeds, Daraja, WhatsApp and push notifications are not configured. Use manual
              records and statement review. No automatic external messages are sent.
            </Text>
            <Button
              label="Open JOJOBUILDS website"
              secondary
              onPress={() => {
                void Linking.openURL(WEB_URL).catch((problem: unknown) =>
                  setError(problem instanceof Error ? problem.message : "Could not open website."),
                );
              }}
            />
          </Card>
          <Button
            label="Sign out on this device"
            secondary
            onPress={() => {
              void logout().catch((problem: unknown) =>
                setError(
                  problem instanceof Error ? problem.message : "Could not remove secure session.",
                ),
              );
            }}
          />
        </>
      )}
    </Screen>
  );
}
