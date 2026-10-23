import { money, type TenantMessage } from "@jojobuilds/api-client";
import { useState } from "react";
import { Text, TextInput } from "react-native";
import { useAuth } from "./auth";
import { NativeMessaging } from "./messaging";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  styles,
  useRefresh,
  useResource,
} from "./ui";

function retryKey() {
  return `message-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function Coordination() {
  const { api, org } = useAuth();
  const permitted = !!org && ["owner", "manager"].includes(org.role);
  const balances = useResource("tenant-balances", permitted);
  const messages = useResource("tenant-messages", permitted);
  const refresh = useRefresh();
  const [selected, setSelected] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState(true);
  const [key, setKey] = useState(retryKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const problem = balances.error || messages.error;
  async function send() {
    if (!selected || !subject.trim() || !body.trim()) {
      setError("Choose a rental and enter a subject and message.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api.post<TenantMessage>("/tenant-messages", {
        tenancy_id: selected,
        subject,
        body,
        deliver_email: email,
        idempotency_key: key,
      });
      setNotice(
        `In-app: ${result.in_app ? "available" : "not linked"}. Email: ${result.email_status.replaceAll("_", " ")}.`,
      );
      setSubject("");
      setBody("");
      setKey(retryKey());
      await refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Message failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      title="Balances & messages"
      subtitle="Property conversations and read-only tenant balances."
      onRefresh={refresh}
    >
      <NativeMessaging key={org?.id} />
      {!permitted ? null : problem ? (
        <ErrorState error={problem} retry={refresh} />
      ) : !balances.data || !messages.data ? (
        <LoadingState />
      ) : (
        <>
          <Text style={styles.muted}>
            Managers cannot record payments, edit agreements or access owner finances.
          </Text>
          {!balances.data.length && <EmptyState title="No assigned rentals" />}
          {balances.data.map((row) => (
            <Card key={row.id}>
              <Text style={styles.heading}>{row.tenant_name}</Text>
              <Text style={styles.text}>
                {row.property_name} / Unit {row.unit} · {row.reference}
              </Text>
              <Text style={styles.muted}>
                {row.email} · {row.phone}
              </Text>
              <Text style={styles.text}>Outstanding: {money(row.balance, org?.currency)}</Text>
              <Text style={styles.text}>Overdue: {money(row.overdue, org?.currency)}</Text>
              <Button
                label={selected === row.id ? "Selected for message" : "Message this rental"}
                secondary
                onPress={() => {
                  setSelected(row.id);
                  setKey(retryKey());
                }}
              />
            </Card>
          ))}
          {selected && (
            <Card>
              <Text style={styles.heading}>Message the selected tenant</Text>
              <TextInput
                accessibilityLabel="Subject"
                placeholder="Subject"
                maxLength={150}
                value={subject}
                onChangeText={(value) => {
                  setSubject(value);
                  setKey(retryKey());
                }}
                style={styles.input}
              />
              <TextInput
                accessibilityLabel="Message"
                placeholder="Message"
                maxLength={2000}
                multiline
                value={body}
                onChangeText={(value) => {
                  setBody(value);
                  setKey(retryKey());
                }}
                style={styles.input}
              />
              <Button
                label={`Email when configured: ${email ? "on" : "off"}`}
                secondary
                onPress={() => {
                  setEmail(!email);
                  setKey(retryKey());
                }}
              />
              {error && <ErrorState error={error} />}
              {notice && (
                <Text accessibilityRole="alert" style={styles.text}>
                  {notice}
                </Text>
              )}
              <Button
                label={busy ? "Sending..." : "Send tenant message"}
                disabled={busy}
                onPress={() => void send()}
              />
              <Text style={styles.muted}>Queued email is not a delivery confirmation.</Text>
            </Card>
          )}
          <Text style={styles.heading}>Message history</Text>
          {!messages.data.length && <EmptyState title="No messages yet" />}
          {messages.data.map((row) => (
            <Card key={row.id}>
              <Text style={styles.heading}>{row.subject}</Text>
              <Text style={styles.muted}>
                {row.property_name} / {row.unit} · {row.sender}
              </Text>
              <Text style={styles.text}>{row.body}</Text>
              <Text style={styles.muted}>Email: {row.email_status.replaceAll("_", " ")}</Text>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
