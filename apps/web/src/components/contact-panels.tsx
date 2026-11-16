"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import type { UseFormRegister } from "react-hook-form";
import { effectiveContacts, type ContactChannels } from "@/lib/contacts";
import type { WorkspaceContext } from "./workspace";
import { ContactLinks } from "./contact-links";
import { ErrorBox, Field, Loading } from "./ui";

function useCompanyContact(ctx: WorkspaceContext) {
  return useQuery({
    queryKey: [ctx.org.id, "organization-contact"],
    queryFn: () => ctx.api.get("organization-contact"),
  });
}

export function ContactChannelFields({
  channels = {},
  prefix = "",
  register,
}: {
  channels?: ContactChannels;
  prefix?: string;
  register?: UseFormRegister<Record<string, string>>;
}) {
  return (
    <fieldset className="contact-fields">
      <legend>{prefix ? `${prefix} contact channels` : "Contact channels"}</legend>
      <p>
        Optional. Use international format, for example +254712345678. Add only numbers you are
        authorized to share with your tenants. Repeat the same number for each channel you offer.
        Leave unwanted channels blank.
      </p>
      {(
        [
          ["call_phone", "Call phone number"],
          ["sms_phone", "SMS phone number"],
          ["whatsapp_phone", "WhatsApp phone number"],
        ] as const
      ).map(([field, label]) => (
        <Field key={field} label={label}>
          <input
            {...(register ? register(field) : { name: field })}
            type="tel"
            inputMode="tel"
            defaultValue={channels[field] ?? ""}
            maxLength={16}
            pattern="[+][1-9][0-9]{6,14}"
            placeholder="+254712345678"
          />
        </Field>
      ))}
    </fieldset>
  );
}

export function CompanyContactSettings({ ctx }: { ctx: WorkspaceContext }) {
  const company = useCompanyContact(ctx);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await ctx.api.request("/organization-contact", {
        method: "PUT",
        body: JSON.stringify({
          name: form.get("name"),
          call_phone: form.get("call_phone"),
          sms_phone: form.get("sms_phone"),
          whatsapp_phone: form.get("whatsapp_phone"),
        }),
      });
      await ctx.refresh();
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      setNotice(
        "Company contact details saved. Tenants can use these channels; no messages were sent.",
      );
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not save company contacts.");
    } finally {
      setBusy(false);
    }
  }
  if (company.error)
    return <ErrorBox message={company.error.message} retry={() => void company.refetch()} />;
  if (!company.data) return <Loading />;
  return (
    <section className="surface contact-panel" aria-labelledby="company-contact-heading">
      <h2 id="company-contact-heading">Company contact details</h2>
      {ctx.org.role === "owner" ? (
        <form onSubmit={save} key={JSON.stringify(company.data)}>
          <p>
            These are tenant-visible company defaults. Each building can override individual
            channels; blank building numbers use the company defaults.
          </p>
          <Field label="Company / landlord name">
            <input name="name" defaultValue={company.data.name} required maxLength={150} />
          </Field>
          <ContactChannelFields channels={company.data} prefix="Company" />
          <button className="button primary" disabled={busy}>
            {busy ? "Saving contacts..." : "Save company contacts"}
          </button>
        </form>
      ) : (
        <p>{company.data.name}. Only the owner can change these details.</p>
      )}
      <ContactLinks channels={company.data} recipient={company.data.name} />
      {error && <ErrorBox message={error} />}
      {notice && (
        <p className="success-box" role="status">
          {notice}
        </p>
      )}
      <ExternalContactNotice />
    </section>
  );
}

export function LandlordContact({
  ctx,
  building,
}: {
  ctx: WorkspaceContext;
  building: ContactChannels & { contact: string };
}) {
  const company = useCompanyContact(ctx);
  const channels = effectiveContacts(building, company.data ?? {});
  return (
    <div className="building-contact">
      <p>Landlord / managing contact: {building.contact || company.data?.name || ctx.org.name}</p>
      <ContactLinks
        channels={channels}
        recipient={building.contact || company.data?.name || ctx.org.name}
      />
      {company.error && (
        <ErrorBox
          message="Company contact details could not be loaded. Only configured building channels are shown."
          retry={() => void company.refetch()}
        />
      )}
    </div>
  );
}

export function LandlordContactDirectory({ ctx }: { ctx: WorkspaceContext }) {
  const properties = useQuery({
    queryKey: [ctx.org.id, "properties"],
    queryFn: () => ctx.api.get("properties"),
  });
  return (
    <section className="surface contact-panel" aria-labelledby="landlord-contacts-heading">
      <h2 id="landlord-contacts-heading">Contact your landlord</h2>
      {properties.error ? (
        <ErrorBox message={properties.error.message} retry={() => void properties.refetch()} />
      ) : !properties.data ? (
        <Loading />
      ) : properties.data.length ? (
        properties.data.map((property) => (
          <section key={property.id}>
            <h3>{property.name}</h3>
            <LandlordContact ctx={ctx} building={property} />
          </section>
        ))
      ) : (
        <p>No building contacts are available for your rentals.</p>
      )}
      <p>
        If no buttons appear, ask the landlord to add contact channels. In-app messages remain
        separate.
      </p>
      <ExternalContactNotice />
    </section>
  );
}

export function ExternalContactNotice() {
  return (
    <p className="form-privacy">
      Call, SMS and WhatsApp open another app. Confirm the recipient and send there yourself.
      Nothing is sent or recorded in the JOJOBUILDS inbox automatically. Phone, SMS and data charges
      may apply. WhatsApp handles messages under its own terms; avoid sharing sensitive rental or
      financial details.
    </p>
  );
}
