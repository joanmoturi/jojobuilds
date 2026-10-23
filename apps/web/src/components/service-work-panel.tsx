"use client";

import {
  createApi,
  money,
  parseMoney,
  type ServiceDocument,
  type ServiceWork,
} from "@jojobuilds/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Badge, Empty, ErrorBox, Field, Loading } from "./ui";

function DocumentCard({
  document,
  api,
  owner,
  refresh,
}: {
  document: ServiceDocument;
  api: ReturnType<typeof createApi>;
  owner: boolean;
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api.post(`/service-documents/${document.id}/review`, {
        decision: data.get("decision"),
        note: data.get("note"),
      });
      await refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Document review failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="request-history">
      <h4>
        {document.kind === "quotation" ? "Quotation" : "Invoice"} / revision {document.revision}
      </h4>
      <Badge>{document.status}</Badge>
      <ul>
        {document.items.map((item, index) => (
          <li key={index}>
            {item.description} / {item.quantity} x {money(item.unit_price, document.currency)}
          </li>
        ))}
      </ul>
      <p>
        <strong>Total: {money(document.amount, document.currency)}</strong>
      </p>
      {document.kind === "quotation" ? (
        <p className="muted">Payment terms: {document.terms_days} days after approval.</p>
      ) : (
        <p className="muted">
          Reference: {document.reference} / Issued: {document.issued_on}
        </p>
      )}
      {document.notes && <p>{document.notes}</p>}
      {document.review_note && <p>Owner review: {document.review_note}</p>}
      {document.payable_id && (
        <p className="muted">
          Linked service bill: {document.payable_id}. Approval is not a payment.
        </p>
      )}
      {owner && document.status === "submitted" && (
        <form onSubmit={review}>
          <Field label="Document decision">
            <select name="decision">
              <option value="approve">Approve {document.kind}</option>
              <option value="reject">Reject for revision</option>
            </select>
          </Field>
          <Field label="Review note">
            <textarea name="note" required minLength={3} maxLength={500} />
          </Field>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving..." : "Save document review"}
          </button>
        </form>
      )}
      {error && <ErrorBox message={error} />}
    </div>
  );
}

function ServiceWorkContent({
  api,
  requestId,
  provider,
  owner,
}: {
  api: ReturnType<typeof createApi>;
  requestId: string;
  provider: boolean;
  owner: boolean;
}) {
  const client = useQueryClient();
  const work = useQuery({
    queryKey: ["service-work", provider ? "provider" : "staff", requestId],
    queryFn: () =>
      api.request<ServiceWork>(
        `/${provider ? "provider-portal/requests" : "maintenance"}/${requestId}/service-work`,
      ),
  });
  const [items, setItems] = useState([
    { id: crypto.randomUUID(), description: "", quantity: "1", price: "" },
  ]);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function refresh() {
    await client.invalidateQueries();
  }
  async function submit(event: FormEvent<HTMLFormElement>, invoice: boolean, quoteId?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = invoice
        ? {
            quote_id: quoteId,
            reference: data.get("reference"),
            issued_on: data.get("issued_on"),
            notes: data.get("notes"),
            idempotency_key: key,
          }
        : {
            items: items.map((item) => ({
              description: item.description,
              quantity: Number(item.quantity),
              unit_price: parseMoney(item.price),
            })),
            terms_days: Number(data.get("terms_days")),
            notes: data.get("notes"),
            idempotency_key: key,
          };
      await api.post(
        `/provider-portal/requests/${requestId}/${invoice ? "invoices" : "quotations"}`,
        payload,
      );
      setNotice(`${invoice ? "Invoice" : "Quotation"} submitted for owner approval.`);
      setKey(crypto.randomUUID());
      form.reset();
      setItems([{ id: crypto.randomUUID(), description: "", quantity: "1", price: "" }]);
      await refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  }
  if (work.error)
    return <ErrorBox message={work.error.message} retry={() => void work.refetch()} />;
  if (!work.data) return <Loading />;
  const documents = work.data.documents;
  const lastQuote = documents.filter((document) => document.kind === "quotation").at(-1);
  const lastInvoice = documents.filter((document) => document.kind === "invoice").at(-1);
  const quoteAllowed =
    provider && work.data.can_quote && (!lastQuote || lastQuote.status === "rejected");
  const invoiceAllowed =
    provider &&
    work.data.accepted &&
    lastQuote?.status === "approved" &&
    (!lastInvoice || lastInvoice.status === "rejected");
  return (
    <section aria-label="Quotations and invoices">
      <p className="muted">
        The owner approves itemized quotations and invoices. A quotation approval creates one unpaid
        service bill; approving its invoice never adds a second bill. Payments are recorded
        separately.
      </p>
      {documents.map((document) => (
        <DocumentCard
          key={document.id}
          document={document}
          api={api}
          owner={owner}
          refresh={refresh}
        />
      ))}
      {!documents.length && (
        <Empty title="No service documents yet">
          Accept the job to submit an itemized quotation.
        </Empty>
      )}
      {quoteAllowed && (
        <form
          onSubmit={(event) => void submit(event, false)}
          onChange={() => setKey(crypto.randomUUID())}
        >
          <h4>
            {lastQuote ? "Revise rejected quotation" : "Submit a quotation"} ({work.data.currency})
          </h4>
          {items.map((item, index) => (
            <fieldset key={item.id}>
              <legend>Item {index + 1}</legend>
              <Field label={`Item ${index + 1} description`}>
                <input
                  required
                  maxLength={200}
                  value={item.description}
                  onChange={(event) =>
                    setItems(
                      items.map((entry) =>
                        entry.id === item.id
                          ? { ...entry, description: event.target.value }
                          : entry,
                      ),
                    )
                  }
                />
              </Field>
              <Field label={`Item ${index + 1} quantity`}>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  step={1}
                  required
                  value={item.quantity}
                  onChange={(event) =>
                    setItems(
                      items.map((entry) =>
                        entry.id === item.id ? { ...entry, quantity: event.target.value } : entry,
                      ),
                    )
                  }
                />
              </Field>
              <Field label={`Item ${index + 1} unit price`}>
                <input
                  inputMode="decimal"
                  required
                  value={item.price}
                  onChange={(event) =>
                    setItems(
                      items.map((entry) =>
                        entry.id === item.id ? { ...entry, price: event.target.value } : entry,
                      ),
                    )
                  }
                />
              </Field>
              {items.length > 1 && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setItems(items.filter((entry) => entry.id !== item.id));
                    setKey(crypto.randomUUID());
                  }}
                >
                  Remove item {index + 1}
                </button>
              )}
            </fieldset>
          ))}
          <button
            type="button"
            className="button secondary"
            disabled={items.length >= 50}
            onClick={() => {
              setItems([
                ...items,
                { id: crypto.randomUUID(), description: "", quantity: "1", price: "" },
              ]);
              setKey(crypto.randomUUID());
            }}
          >
            Add quotation item
          </button>
          <Field label="Payment terms (days after approval)">
            <input type="number" name="terms_days" min={0} max={365} defaultValue={14} required />
          </Field>
          <Field label="Quotation notes">
            <textarea name="notes" maxLength={1000} />
          </Field>
          <button className="button primary" disabled={busy}>
            {busy ? "Submitting..." : "Submit quotation"}
          </button>
        </form>
      )}
      {invoiceAllowed && (
        <form
          onSubmit={(event) => void submit(event, true, lastQuote.id)}
          onChange={() => setKey(crypto.randomUUID())}
        >
          <h4>{lastInvoice ? "Revise rejected invoice" : "Submit an invoice"}</h4>
          <p>
            Approved total: {money(lastQuote.amount, lastQuote.currency)}. Item prices cannot be
            changed on the invoice.
          </p>
          <Field label="Invoice reference">
            <input name="reference" required maxLength={150} />
          </Field>
          <Field label="Invoice issue date">
            <input name="issued_on" type="date" required />
          </Field>
          <Field label="Invoice notes">
            <textarea name="notes" maxLength={1000} />
          </Field>
          <button className="button primary" disabled={busy}>
            {busy ? "Submitting..." : "Submit invoice"}
          </button>
        </form>
      )}
      {error && <ErrorBox message={error} />}
      {notice && (
        <p role="status" className="success-box">
          {notice}
        </p>
      )}
    </section>
  );
}

export function ServiceWorkPanel(props: {
  api: ReturnType<typeof createApi>;
  requestId: string;
  provider?: boolean;
  owner?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Quotations and invoices</summary>
      {open && <ServiceWorkContent {...props} provider={!!props.provider} owner={!!props.owner} />}
    </details>
  );
}
