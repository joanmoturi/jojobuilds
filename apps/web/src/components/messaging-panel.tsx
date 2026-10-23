"use client";

import { createApi, type Conversation, type MessageContact } from "@jojobuilds/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Badge, Empty, ErrorBox, Field, Loading } from "./ui";

function contactKey(contact: MessageContact) {
  return [contact.user_id, contact.property_id, contact.tenancy_id, contact.request_id].join(":");
}

export function MessagingPanel({
  api,
  orgId,
  owner = false,
  requestId,
}: {
  api: ReturnType<typeof createApi>;
  orgId: string;
  owner?: boolean;
  requestId?: string;
}) {
  const client = useQueryClient();
  const contacts = useQuery({
    queryKey: ["message-contacts", orgId],
    queryFn: () =>
      api.request<MessageContact[]>(`/messaging/contacts?org_id=${encodeURIComponent(orgId)}`),
  });
  const threads = useQuery({
    queryKey: ["conversations", orgId, requestId],
    queryFn: () =>
      api.request<Conversation[]>(
        `/conversations?org_id=${encodeURIComponent(orgId)}${requestId ? `&request_id=${encodeURIComponent(requestId)}` : ""}`,
      ),
    refetchInterval: 15000,
  });
  const [selected, setSelected] = useState("");
  const [contactIndex, setContactIndex] = useState("");
  const [body, setBody] = useState("");
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ownOnly, setOwnOnly] = useState(false);
  const thread = threads.data?.find((entry) => entry.id === selected);
  const eligible =
    contacts.data?.filter((entry) => !requestId || entry.request_id === requestId) ?? [];
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        const contact = eligible.find((entry) => contactKey(entry) === contactIndex);
        if (contactIndex === "" || !contact) throw new Error("Choose a recipient first.");
        result = await api.post<Conversation>("/conversations", {
          org_id: orgId,
          property_id: contact.property_id,
          recipient_id: contact.user_id,
          tenancy_id: contact.tenancy_id,
          request_id: contact.request_id,
          body,
          idempotency_key: key,
        });
      }
      setBody("");
      setKey(crypto.randomUUID());
      setSelected(result.id);
      setNotice("Message sent in-app.");
      await client.invalidateQueries({ queryKey: ["conversations", orgId] });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Message could not be sent.");
    } finally {
      setBusy(false);
    }
  }
  function choose(id: string) {
    setSelected(id);
    setBody("");
    setKey(crypto.randomUUID());
    setError("");
    setNotice("");
  }
  const problem = contacts.error || threads.error;
  if (problem)
    return (
      <ErrorBox
        message={problem.message}
        retry={() => {
          void contacts.refetch();
          void threads.refetch();
        }}
      />
    );
  if (!contacts.data || !threads.data) return <Loading />;
  return (
    <section aria-label="Property conversations">
      <h2>Property conversations</h2>
      <p className="muted">
        Messages stay within the selected property, rental or service job. Property owners can
        review all conversations for their properties. In-app delivery only.
      </p>
      <div className="toolbar">
        <button className="button secondary" onClick={() => choose("")}>
          New conversation
        </button>
        <button className="button secondary" onClick={() => void threads.refetch()}>
          Refresh inbox
        </button>
        {owner && (
          <label>
            <input
              type="checkbox"
              checked={ownOnly}
              onChange={(event) => setOwnOnly(event.target.checked)}
            />{" "}
            My conversations only
          </label>
        )}
      </div>
      <div className="maintenance-grid">
        <div>
          {!threads.data.length && (
            <Empty title="No conversations yet">Start with a property contact.</Empty>
          )}
          {threads.data
            .filter((entry) => !ownOnly || !entry.observer)
            .map((entry) => (
              <button
                type="button"
                className="button secondary wide"
                key={entry.id}
                onClick={() => choose(entry.id)}
                aria-pressed={selected === entry.id}
                style={{ display: "block", marginBottom: 10, textAlign: "left" }}
              >
                <strong>{entry.participants.join(" / ")}</strong>
                <br />
                {entry.property_name} / {entry.context_label}
                {entry.observer && " / Owner oversight (read-only)"}
                <br />
                <small>{entry.messages.at(-1)?.body.slice(0, 100)}</small>
              </button>
            ))}
        </div>
        <article className="surface maintenance-card">
          <h3>{thread ? thread.participants.join(" / ") : "Start a conversation"}</h3>
          {thread && (
            <>
              <p className="muted">
                {thread.property_name} / {thread.context_label}
              </p>
              {thread.observer && <Badge>Owner oversight - read-only</Badge>}
              <div
                role="log"
                aria-label="Conversation messages"
                style={{ maxHeight: 450, overflowY: "auto" }}
              >
                {thread.messages.map((message) => (
                  <div key={message.id} className="request-history">
                    <strong>{message.sender}</strong>{" "}
                    <small>{new Date(message.created_at).toLocaleString()}</small>
                    <p style={{ whiteSpace: "pre-wrap" }}>{message.body}</p>
                  </div>
                ))}
              </div>
            </>
          )}
          {!thread?.observer && (
            <form onSubmit={send}>
              {!thread && (
                <Field label="Recipient and property">
                  <select
                    required
                    value={contactIndex}
                    onChange={(event) => {
                      setContactIndex(event.target.value);
                      setKey(crypto.randomUUID());
                    }}
                  >
                    <option value="">Choose a property contact</option>
                    {eligible.map((contact) => (
                      <option key={contactKey(contact)} value={contactKey(contact)}>
                        {contact.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Conversation message">
                <textarea
                  required
                  maxLength={2000}
                  rows={4}
                  value={body}
                  onChange={(event) => {
                    setBody(event.target.value);
                    setKey(crypto.randomUUID());
                  }}
                />
              </Field>
              <button className="button primary" disabled={busy || (!thread && !eligible.length)}>
                {busy ? "Sending..." : "Send message"}
              </button>
            </form>
          )}
          {error && <ErrorBox message={error} />}
          {notice && (
            <p role="status" className="success-box">
              {notice}
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
