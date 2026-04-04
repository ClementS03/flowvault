import type { ReactNode } from "react";
import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Privacy Policy | ${config.appName}`,
  canonicalUrlRelative: "/privacy-policy",
});

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mb-10">
    <h2 className="font-heading font-semibold text-xl text-ink mb-4">{title}</h2>
    <div className="space-y-3 text-sm text-ink-2 leading-relaxed">{children}</div>
  </section>
);

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink transition-colors mb-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Back
        </Link>

        <div className="mb-10">
          <h1 className="font-heading font-bold text-3xl text-ink mb-2">Privacy Policy</h1>
          <p className="text-sm text-ink-3">Last updated: April 4, 2026</p>
        </div>

        <Section title="1. Who we are">
          <p>
            FlowVault is operated by Clément Seguin, auto-entrepreneur registered in France
            (SIRET 909 969 685 00025), 9 rue Marie Angèle Cléret, 03130 Montcombroux-les-Mines.
          </p>
          <p>
            Contact: <a href="mailto:hello@flowvault.io" className="text-accent hover:underline">hello@flowvault.io</a>
          </p>
          <p>
            As data controller, Clément Seguin is responsible for the personal data collected
            through <strong>flowvault.io</strong> (the &quot;Service&quot;).
          </p>
        </Section>

        <Section title="2. Data we collect">
          <p>We collect only what is strictly necessary to provide the Service:</p>
          <ul className="list-disc list-inside space-y-2 ml-1">
            <li>
              <strong>Account data</strong> — email address, name and profile picture (when you
              sign in via Google OAuth or Magic Link).
            </li>
            <li>
              <strong>Profile data</strong> — username you choose, your subscription plan
              (free / pro), component count, optional avatar you upload.
            </li>
            <li>
              <strong>Component data</strong> — component name, description, category, tags,
              Webflow JSON payload, optional preview image, visibility settings, password hash
              (if you password-protect a component).
            </li>
            <li>
              <strong>Usage data</strong> — when a component is copied, we log the component ID
              and, if you are logged in, your user ID. This powers the copy-count displayed on
              each component.
            </li>
            <li>
              <strong>Payment data</strong> — your Stripe customer ID. We do <strong>not</strong>{" "}
              store card numbers or banking details; these are handled exclusively by Stripe.
            </li>
            <li>
              <strong>Technical data</strong> — server access logs (IP address, browser,
              timestamp) retained by Vercel for up to 30 days for security and debugging.
            </li>
          </ul>
        </Section>

        <Section title="3. How we use your data">
          <p>Your data is used solely to:</p>
          <ul className="list-disc list-inside space-y-2 ml-1">
            <li>Create and manage your account (contractual basis — Art. 6.1.b GDPR)</li>
            <li>Store, display and share your components (contractual basis)</li>
            <li>Process your Pro subscription payment via Stripe (contractual basis)</li>
            <li>Send transactional emails (magic link, billing receipts) via Resend (contractual basis)</li>
            <li>Measure aggregate, anonymous site traffic via Vercel Analytics (legitimate interest — Art. 6.1.f GDPR)</li>
            <li>Prevent fraud and abuse (legitimate interest)</li>
          </ul>
          <p>We do not sell your data. We do not use your data for advertising.</p>
        </Section>

        <Section title="4. Cookies and tracking">
          <p>
            FlowVault uses <strong>no advertising or tracking cookies</strong>.
          </p>
          <ul className="list-disc list-inside space-y-2 ml-1">
            <li>
              <strong>Session cookie</strong> — Supabase sets a short-lived session cookie
              strictly necessary for authentication. No consent is required (essential cookie).
            </li>
            <li>
              <strong>Analytics</strong> — We use{" "}
              <a href="https://vercel.com/analytics" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">Vercel Analytics</a>,
              a privacy-friendly analytics tool that collects no personal data and sets no cookies.
              No cookie banner is required.
            </li>
          </ul>
        </Section>

        <Section title="5. Data processors (sub-processors)">
          <p>
            We use the following trusted third parties to operate the Service. Each has signed a
            Data Processing Agreement and provides appropriate GDPR safeguards (Standard
            Contractual Clauses where data is transferred outside the EU):
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-border rounded-lg overflow-hidden mt-2">
              <thead>
                <tr className="bg-surface">
                  <th className="text-left px-3 py-2 font-semibold text-ink">Provider</th>
                  <th className="text-left px-3 py-2 font-semibold text-ink">Purpose</th>
                  <th className="text-left px-3 py-2 font-semibold text-ink">Country</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Vercel Inc.", "Hosting & CDN", "USA (SCC)"],
                  ["Supabase Inc.", "Database, Auth & Storage", "USA/EU (SCC)"],
                  ["Stripe Inc.", "Payment processing", "USA (SCC, PCI-DSS)"],
                  ["Resend Inc.", "Transactional email", "USA (SCC)"],
                  ["Vercel Analytics", "Anonymous traffic analytics", "USA (SCC)"],
                ].map(([provider, purpose, country]) => (
                  <tr key={provider} className="border-t border-border">
                    <td className="px-3 py-2 text-ink">{provider}</td>
                    <td className="px-3 py-2">{purpose}</td>
                    <td className="px-3 py-2">{country}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="6. Data retention">
          <ul className="list-disc list-inside space-y-2 ml-1">
            <li>Account and profile data: until you delete your account</li>
            <li>Components and files: until you delete them or delete your account</li>
            <li>Copy logs: until account deletion</li>
            <li>Stripe customer ID: deleted from our database when you delete your account (Stripe retains billing records as required by law)</li>
            <li>Vercel access logs: 30 days</li>
            <li>Vercel Analytics data: aggregate only, no personal data retained</li>
          </ul>
        </Section>

        <Section title="7. Your rights (GDPR)">
          <p>
            As a data subject under the GDPR, you have the following rights. To exercise any of
            them, contact us at{" "}
            <a href="mailto:hello@flowvault.io" className="text-accent hover:underline">hello@flowvault.io</a>.
            We will respond within 30 days.
          </p>
          <ul className="list-disc list-inside space-y-2 ml-1">
            <li><strong>Right of access</strong> (Art. 15) — request a copy of your data</li>
            <li><strong>Right to rectification</strong> (Art. 16) — correct inaccurate data via Settings</li>
            <li>
              <strong>Right to erasure</strong> (Art. 17) — delete your account and all associated
              data via Settings → Delete account (immediate and permanent)
            </li>
            <li><strong>Right to data portability</strong> (Art. 20) — request a machine-readable export by email</li>
            <li><strong>Right to object</strong> (Art. 21) — object to processing based on legitimate interest</li>
            <li>
              <strong>Right to lodge a complaint</strong> — with the French data protection
              authority:{" "}
              <a href="https://www.cnil.fr" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">CNIL</a>{" "}
              (Commission Nationale de l&apos;Informatique et des Libertés)
            </li>
          </ul>
        </Section>

        <Section title="8. Data security">
          <p>
            We implement appropriate technical and organisational measures to protect your data:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-1">
            <li>All data is transmitted over HTTPS (TLS 1.2+)</li>
            <li>Database access is restricted via Row-Level Security (Supabase RLS)</li>
            <li>Component files in private storage are accessible only via short-lived signed URLs</li>
            <li>Passwords (for protected components) are hashed — we never store them in plain text</li>
            <li>Service-role credentials are never exposed client-side</li>
          </ul>
        </Section>

        <Section title="9. Children's privacy">
          <p>
            FlowVault is not directed to children under 16. We do not knowingly collect data from
            minors. If you believe a child has provided us with personal data, contact us
            immediately at{" "}
            <a href="mailto:hello@flowvault.io" className="text-accent hover:underline">hello@flowvault.io</a>.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant
            changes by email and by updating the date at the top of this page. Continued use of
            the Service after the update constitutes acceptance.
          </p>
        </Section>

        <div className="border-t border-border pt-8 text-sm text-ink-3">
          <p>
            Questions? Contact us at{" "}
            <a href="mailto:hello@flowvault.io" className="text-accent hover:underline">hello@flowvault.io</a>
          </p>
        </div>
      </div>
    </main>
  );
}
