import Link from 'next/link';
import { getSEOTags } from '@/libs/seo';
import config from '@/config';
import ButtonCheckout from '@/components/ButtonCheckout';
import FaqAccordion from '@/components/FaqAccordion';

export const metadata = getSEOTags({
  title: `Pricing | ${config.appName}`,
  description: 'Free forever for casual makers. Pro for unlimited components.',
  canonicalUrlRelative: '/pricing',
});

const FREE_FEATURES = [
  'Up to 10 components',
  'Public & private sharing',
  'Copy to Webflow in one click',
  'Browse the marketplace',
];

const PRO_FEATURES = [
  'Unlimited components',
  'Public & private sharing',
  'Copy to Webflow in one click',
  'Browse the marketplace',
  'Priority support',
];

export default function PricingPage() {
  const plan = config.stripe.plans[0];

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto px-[var(--px-site)] py-20" style={{ maxWidth: 'var(--max-width)' }}>
        <div className="text-center mb-14">
          <h1 className="font-heading font-bold text-4xl text-ink mb-4">Simple, honest pricing</h1>
          <p className="text-ink-2 text-lg max-w-md mx-auto">Free forever for casual makers. Pro for those who ship every day.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <div className="rounded-2xl border border-border bg-bg p-8 flex flex-col">
            <div className="mb-6">
              <h2 className="font-heading font-bold text-xl text-ink mb-1">Free</h2>
              <p className="text-ink-3 text-sm">Get started, no credit card needed.</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-ink">$0</span>
              <span className="text-ink-3 text-sm ml-1">forever</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-ink-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ink-3 shrink-0">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  {f}
                </li>
              ))}
              <li className="flex items-center gap-2.5 text-sm text-ink-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
                Limited to 10 components
              </li>
            </ul>
            <Link href="/dashboard" className="w-full flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-border text-ink font-medium px-4 py-3 text-sm transition-colors">
              Stay on free
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border-2 border-accent bg-bg p-8 flex flex-col relative overflow-hidden">
            <div className="absolute top-5 right-5">
              <span className="rounded-full bg-accent-bg text-accent text-xs font-semibold px-3 py-1">Unlimited</span>
            </div>
            <div className="mb-6">
              <h2 className="font-heading font-bold text-xl text-ink mb-1">Pro</h2>
              <p className="text-ink-3 text-sm">{plan.description}</p>
            </div>
            <div className="mb-6 flex items-end gap-2">
              <span className="text-4xl font-bold text-ink">${plan.price}</span>
              <span className="text-ink-3 text-sm mb-1">/month</span>
              {plan.priceAnchor && <span className="text-ink-3 text-sm line-through mb-1">${plan.priceAnchor}</span>}
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-ink-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-accent shrink-0">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <ButtonCheckout priceId={plan.priceId} mode="subscription" />
            <p className="mt-3 text-center text-xs text-ink-3">Cancel anytime. No lock-in.</p>
          </div>
        </div>

        <FaqAccordion />
      </div>
    </main>
  );
}
