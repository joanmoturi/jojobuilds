import type { Conversation, MessageContact } from "@jojobuilds/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useAuth } from "./auth";
import { Button, Card, EmptyState, ErrorState, LoadingState, styles } from "./ui";

function retryKey() {
  return `conversation-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function contactKey(contact: MessageContact) {
  return [contact.user_id, contact.property_id, contact.tenancy_id, contact.request_id].join(":");
}

export function NativeMessaging() {
  const { api, org } = useAuth();
  const client = useQueryClient();
  const contacts = useQuery({
    queryKey: ["message-contacts", org?.id],
    queryFn: () =>
      api.request<MessageContact[]>(`/messaging/contacts?org_id=${encodeURIComponent(org!.id)}`),
    enabled: !!org,
  });
  const conversations = useQuery({
    queryKey: ["conversations", org?.id],
    queryFn: () =>
      api.request<Conversation[]>(`/conversations?org_id=${encodeURIComponent(org!.id)}`),
    enabled: !!org,
    refetchInterval: 15000,
  });
  const [selected, setSelected] = useState("");
  const [recipient, setRecipient] = useState("");
  const [body, setBody] = useState("");
  const [key, setKey] = useState(retryKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const thread = conversations.data?.find((entry) => entry.id === selected);
  function choose(id: string) {
    setSelected(id);
    setBody("");
    setKey(retryKey());
    setError("");
    setNotice("");
  }
  async function send() {
    if (!org || !body.trim()) {
      setError("Enter a message.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let result: Conversation;
      if (thread) {
        result = await api.post<Conversation>(`/conversations/${thread.id}/messages`, {
          body,
          idempotency_key: key,
        });
      } else {
        const contact = contacts.data?.find((entry) => contactKey(entry) === recipient);
        if (!contact) throw new Error("Choose a property contact.");
        result = await api.post<Conversation>("/conversations", {
          org_id: org.id,
          property_id: contact.property_id,
          recipient_id: contact.user_id,
          tenancy_id: contact.tenancy_id,
          request_id: contact.request_id,
          body,
          idempotency_key: key,
        });
      }
      setSelected(result.id);
      setBody("");
      setKey(retryKey());
      setNotice("Message sent in-app.");
      await client.invalidateQueries({ queryKey: ["conversations", org.id] });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Message failed.");
    } finally {
      setBusy(false);
    }
  }
  if (!org) return <ErrorState error="Select an organization to open messages." />;
  const problem = contacts.error || conversations.error;
  if (problem)
    return (
      <ErrorState
        error={problem}
        retry={() => {
          void contacts.refetch();
          void conversations.refetch();
        }}
      />
    );
  if (!contacts.data || !conversations.data) return <LoadingState />;
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.heading}>Property conversations</Text>
      <Text style={styles.muted}>
        Owners can review all conversations for their properties. Messages are delivered in-app
        only.
      </Text>
      <Button label="New conversation" secondary onPress={() => choose("")} />
      <Button
        label="Refresh inbox"
        secondary
        onPress={() => {
          void conversations.refetch();
          void contacts.refetch();
        }}
      />
      {!conversations.data.length && <EmptyState title="No conversations yet" />}
      {conversations.data.map((entry) => (
        <Button
          key={entry.id}
          secondary={entry.id !== selected}
          label={`${entry.participants.join(" / ")} / ${entry.property_name} / ${entry.context_label}${entry.observer ? " / Owner oversight" : ""}`}
          onPress={() => choose(entry.id)}
        />
      ))}
      <Card>
        {thread ? (
          <>
            <Text style={styles.heading}>{thread.participants.join(" / ")}</Text>
            <Text style={styles.muted}>
              {thread.property_name} / {thread.context_label}
            </Text>
            {thread.observer && <Text style={styles.muted}>Owner oversight - read-only</Text>}
            {thread.messages.map((message) => (
              <View key={message.id}>
                <Text style={styles.muted}>
                  {message.sender} / {new Date(message.created_at).toLocaleString()}
                </Text>
                <Text style={styles.text}>{message.body}</Text>
              </View>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.heading}>Choose a recipient and property</Text>
            {contacts.data.map((contact) => (
              <Button
                key={contactKey(contact)}
                label={contact.label}
                secondary={recipient !== contactKey(contact)}
                onPress={() => {
                  setRecipient(contactKey(contact));
                  setKey(retryKey());
                }}
              />
            ))}
          </>
        )}
        {!thread?.observer && (
          <>
            <TextInput
              accessibilityLabel="Conversation message"
              placeholder="Message"
              value={body}
              multiline
              maxLength={2000}
              style={styles.input}
              onChangeText={(value) => {
                setBody(value);
                setKey(retryKey());
              }}
            />
            <Button
              label={busy ? "Sending..." : "Send message"}
              disabled={busy}
              onPress={() => void send()}
            />
          </>
        )}
        {error && <ErrorState error={error} />}
        {notice && (
          <Text accessibilityRole="alert" style={styles.text}>
            {notice}
          </Text>
        )}
      </Card>
    </View>
  );
}
