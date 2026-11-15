import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { policies, policyVersion } from "@/lib/policies";

export function generateStaticParams() {
  return Object.keys(policies).map((policy) => ({ policy }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ policy: string }>;
}): Promise<Metadata> {
  const { policy } = await params;
  return { title: `${policies[policy]?.title ?? "Policy"} | JOJOBUILDS` };
}

export default async function PolicyPage({ params }: { params: Promise<{ policy: string }> }) {
  const { policy } = await params;
  const content = Object.hasOwn(policies, policy) ? policies[policy] : undefined;
  if (!content) notFound();
  const name = process.env.BUSINESS_LEGAL_NAME || "JojoBuilds Landlord and Tenancy";
  const email = process.env.BUSINESS_CONTACT_EMAIL || "";
  const address = process.env.BUSINESS_PUBLIC_ADDRESS || "";
  return (
    <main id="main-content" className="legal-page">
      <Link className="button secondary" href="/">
        Back to JOJOBUILDS
      </Link>
      <h1>{content.title}</h1>
      <p>Draft for development use. Updated {policyVersion}.</p>
      <div className="info-strip" role="note">
        These pages are not a legal compliance certification. Operator identity, contact details,
        retention decisions and legal review must be completed before public real-data use.
      </div>
      <section aria-labelledby="operator-heading">
        <h2 id="operator-heading">Operator details</h2>
        <dl className="operator-details">
          <dt>Supplied business name (registration not verified)</dt>
          <dd>{name}</dd>
          <dt>Public support / privacy email</dt>
          <dd aria-label={email ? undefined : "Not yet supplied"}>{email || "\u00a0"}</dd>
          <dt>Public business address</dt>
          <dd aria-label={address ? undefined : "Not yet supplied"}>{address || "\u00a0"}</dd>
          <dt>Initial operating country</dt>
          <dd>Kenya</dd>
        </dl>
        {(!email || !address) && (
          <p className="error-box">
            Public contact details are incomplete. Do not submit real personal data.
          </p>
        )}
      </section>
      {content.sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <p>{section.text}</p>
        </section>
      ))}
    </main>
  );
}
