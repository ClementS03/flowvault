import type { ReactNode } from "react";
import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Terms of Service | ${config.appName}`,
  canonicalUrlRelative: "/tos",
});

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mb-10">
    <h2 className="font-heading font-semibold text-xl text-ink mb-4">{title}</h2>
    <div className="space-y-3 text-sm text-ink-2 leading-relaxed">{children}</div>
  </section>
);

export default function TermsOfService() {
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
          <h1 className="font-heading font-bold text-3xl text-ink mb-2">Terms of Service</h1>
          <p className="text-sm text-ink-3">Last updated: April 4, 2026</p>
        </div>

        <Section title="1. Acceptance">
          <p>
            By accessing or using FlowVault (&quot;the Service&quot;), you agree to be bound by
            these Terms of Service (&quot;Terms&quot;). If you do not agree, do not use the
            Service.
          </p>
          <p>
            The Service is operated by Clément Seguin, auto-entrepreneur (SIRET 909 969 685 00025),
            France. Contact:{" "}
            <a href="mailto:contact@clement-seguin.fr" className="text-accent hover:underline">
              contact@clement-seguin.fr
            </a>
          </p>
        </Section>

        <Section title="2. Description of the Service">
          <p>
            FlowVault is a platform for storing, sharing and copying Webflow components. Users
            can paste Webflow component JSON, publish it with a unique link, and share it with the
            community for direct paste into the Webflow Designer.
          </p>
        </Section>

        <Section title="3. Account">
          <p>
            You may use the Service without an account (anonymous upload, 24-hour expiry). To
            store components permanently, you must create an account using Google OAuth or a Magic
            Link email.
          </p>
          <p>You are responsible for:</p>
          <ul className="list-disc list-inside space-y-2 ml-1">
            <li>Maintaining the confidentiality of your account</li>
            <li>All activity that occurs under your account</li>
            <li>Providing accurate information (username, email)</li>
          </ul>
          <p>
            You must be at least 16 years old to create an account.
          </p>
        </Section>

        <Section title="4. User content">
          <p>
            You retain full ownership of the Webflow components and associated content you upload
            (&quot;User Content&quot;).
          </p>
          <p>
            By publishing a component as public, you grant FlowVault a non-exclusive, worldwide,
            royalty-free license to display, distribute and allow copying of that component through
            the Service. This license ends when you delete the component or your account.
          </p>
          <p>You represent and warrant that:</p>
          <ul className="list-disc list-inside space-y-2 ml-1">
            <li>You own or have the necessary rights to the content you upload</li>
            <li>Your content does not infringe any third-party intellectual property rights</li>
            <li>Your content does not contain malware, malicious code, or harmful scripts</li>
            <li>Your content complies with applicable laws</li>
          </ul>
        </Section>

        <Section title="5. Prohibited use">
          <p>You may not use the Service to:</p>
          <ul className="list-disc list-inside space-y-2 ml-1">
            <li>Upload components containing malware, tracking scripts, or malicious code</li>
            <li>Infringe intellectual property rights of Webflow or any third party</li>
            <li>Scrape, crawl or systematically download content without prior written consent</li>
            <li>Attempt to reverse-engineer, hack or disrupt the Service</li>
            <li>Create multiple accounts to circumvent the free plan limits</li>
            <li>Upload illegal content or content that violates any applicable law</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate these Terms,
            without notice.
          </p>
        </Section>

        <Section title="6. Content moderation">
          <p>
            FlowVault is a marketplace for Webflow components. We reserve the right to unpublish
            any public component that, in our sole judgment:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-1">
            <li>Is not a Webflow component (e.g. unrelated content, spam, placeholder files)</li>
            <li>Contains malicious code, tracking scripts, or harmful content</li>
            <li>Infringes intellectual property rights</li>
            <li>Violates these Terms or applicable law</li>
          </ul>
          <p>
            When a component is unpublished, it is made private — it is not deleted. The author
            retains access to it in their library. We will endeavour to notify the author by email
            and provide a reason. The author may edit the component and resubmit it for review.
            Resubmitted components will not become public until explicitly approved.
          </p>
          <p>
            This moderation right exists solely to maintain the quality and integrity of the public
            marketplace. It does not apply to private components.
          </p>
        </Section>

        <Section title="7. Plans and billing">
          <p>
            <strong>Free plan</strong> — up to 10 stored components, unlimited copies received,
            unlimited public and private sharing. No credit card required.
          </p>
          <p>
            <strong>Pro plan</strong> — $9.00 USD per month, billed monthly. Unlimited stored
            components and all Free features.
          </p>
          <p>
            Subscriptions renew automatically each month. You may cancel at any time via the
            billing portal (account menu → Billing). Cancellation takes effect at the end of the
            current billing period — you retain Pro access until then.
          </p>
          <p>
            <strong>Refunds</strong> — Payments are non-refundable except where required by
            applicable law. If you believe a charge was made in error, contact us within 7 days
            at{" "}
            <a href="mailto:contact@clement-seguin.fr" className="text-accent hover:underline">
              contact@clement-seguin.fr
            </a>.
          </p>
          <p>
            If a payment fails, your account will be downgraded to the Free plan. Existing
            components beyond the 10-component limit will remain accessible but you will be unable
            to upload new ones until you upgrade or reduce your count.
          </p>
        </Section>

        <Section title="8. Intellectual property">
          <p>
            All elements of the Service (design, code, logo, brand name &quot;FlowVault&quot;)
            are the exclusive property of Clément Seguin and are protected by French and
            international intellectual property law. You may not reproduce or use them without
            prior written permission.
          </p>
          <p>
            Webflow, the Webflow Designer and XscpData format are the property of Webflow, Inc.
            FlowVault is an independent, community-driven tool and is not affiliated with,
            endorsed by, or sponsored by Webflow, Inc.
          </p>
        </Section>

        <Section title="9. Availability and disclaimer">
          <p>
            We strive for high availability but do not guarantee uninterrupted access. The Service
            is provided &quot;as is&quot; without warranties of any kind, express or implied.
          </p>
          <p>
            We are not responsible for any loss of data, loss of revenue, or indirect damages
            arising from your use of or inability to use the Service. Our total liability to you
            shall not exceed the amount you paid in the 12 months preceding the claim.
          </p>
        </Section>

        <Section title="10. Account deletion">
          <p>
            You may delete your account at any time via Settings → Delete account. This
            permanently and irreversibly deletes all your components, files, profile data and
            usage history. Your active subscription (if any) is cancelled immediately.
          </p>
          <p>
            We may suspend or delete accounts that violate these Terms, at our sole discretion,
            with or without notice.
          </p>
        </Section>

        <Section title="11. Changes to the Terms">
          <p>
            We may update these Terms from time to time. We will notify you by email at least 14
            days before significant changes take effect. Continued use of the Service after the
            effective date constitutes acceptance of the new Terms.
          </p>
        </Section>

        <Section title="12. Governing law and disputes">
          <p>
            These Terms are governed by French law. In the event of a dispute, the parties will
            first attempt an amicable resolution. Failing that, disputes shall be submitted to the
            competent French courts.
          </p>
          <p>
            If you are a consumer resident in another EU member state, you may also benefit from
            the mandatory consumer protection provisions of your country of residence.
          </p>
        </Section>

        <div className="border-t border-border pt-8 space-y-2">
          <p className="text-sm text-ink-3">
            See also our{" "}
            <Link href="/privacy-policy" className="text-accent hover:underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/legal" className="text-accent hover:underline">
              Legal notices
            </Link>
            .
          </p>
          <p className="text-sm text-ink-3">
            Questions?{" "}
            <a href="mailto:contact@clement-seguin.fr" className="text-accent hover:underline">
              contact@clement-seguin.fr
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
