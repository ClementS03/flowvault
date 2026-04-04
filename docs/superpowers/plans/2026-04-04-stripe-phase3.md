# FlowVault Stripe Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Stripe subscriptions end-to-end — webhook, pricing page, upgrade modal, enforcement — so free users are capped at 10 components and Pro ($9/mo) users get unlimited.

**Architecture:** The webhook at `/api/stripe/webhook` is the single source of truth for plan status. It writes `profiles.plan` and `profiles.customer_id`. Everything else (pricing page, upgrade modal, banner, enforcement) reads from that field. ShipFast already has `libs/stripe.ts`, `create-checkout`, `create-portal`, and `ButtonCheckout` — we wire them up, not rewrite them.

**Tech Stack:** Next.js 14 App Router · Stripe Node SDK · Supabase `supabaseAdmin` (service role, webhook-safe) · React client components for modal/banner

**Branch:** `feature/stripe` — do NOT merge to main until all tasks pass manual testing.

**Domain note:** When you get a custom domain, the only changes are `config.ts → domainName` and `NEXT_PUBLIC_APP_URL` in Vercel. Everything uses those two values.

---

## Files map

| File | Action | Purpose |
|---|---|---|
| `app/api/stripe/webhook/route.ts` | **Create** | Receive Stripe events, update profiles |
| `app/pricing/page.tsx` | **Create** | Free vs Pro comparison page |
| `components/UpgradeModal.tsx` | **Create** | Overlay shown when free limit hit |
| `components/UpgradeBanner.tsx` | **Create** | Dashboard warning at 8/10 components |
| `app/actions/createComponent.ts` | **Modify** | Error code → `FREE_LIMIT_REACHED` |
| `components/UploadSlideOver.tsx` | **Modify** | Catch `FREE_LIMIT_REACHED`, show modal |
| `app/dashboard/page.tsx` | **Modify** | Pass plan+count props to UpgradeBanner |
| `components/Header.tsx` | **Modify** | Add Pricing link to navLinks |
| `components/ButtonCheckout.tsx` | **Modify** | Replace DaisyUI classes with design system |
| `app/actions/deleteAccount.ts` | **Create** | RGPD right to erasure |
| `app/settings/page.tsx` | **Modify** | Add "Delete account" section |

---

## Task 1: Supabase — add `customer_id` column

**Files:**
- No code file — SQL run in Supabase dashboard

- [ ] **Step 1: Run migration in Supabase SQL Editor**

Go to Supabase Dashboard → SQL Editor → New query. Run:

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS customer_id text;
```

Expected output: `ALTER TABLE` with no error.

- [ ] **Step 2: Verify column exists**

In Supabase → Table Editor → `profiles` table. Confirm `customer_id` column appears with type `text`, nullable.

---

## Task 2: Configure environment variables

**Files:**
- `.env.local` (local dev — never commit)
- Vercel dashboard (production)

- [ ] **Step 1: Create/update `.env.local`**

Add these lines (use Stripe **test mode** keys for local dev):

```
STRIPE_SECRET_KEY=[your Stripe test secret key — sk_test_...]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[your Stripe test publishable key — pk_test_...]
STRIPE_WEBHOOK_SECRET=[from Stripe CLI output — whsec_...]
```

The `STRIPE_WEBHOOK_SECRET` for local dev comes from the Stripe CLI (see Task 3, Step 1).

- [ ] **Step 2: Update `config.ts` with real price IDs**

Open `config.ts`. Replace the placeholder price IDs in the `stripe.plans` array:

```typescript
stripe: {
  plans: [
    {
      priceId:
        process.env.NODE_ENV === "development"
          ? "price_XXXXXXXX_test"   // ← Stripe test mode price ID (price_...)
          : "price_XXXXXXXX_live",  // ← Stripe live mode price ID (price_...)
      isFeatured: true,
      name: "Pro",
      description: "Unlimited components, unlimited sharing",
      price: 9,
      priceAnchor: 19,
      features: [
        { name: "Unlimited components" },
        { name: "Public & private sharing" },
        { name: "Priority support" },
      ],
    },
  ],
},
```

- [ ] **Step 3: Commit config change**

```bash
git add config.ts
git commit -m "feat(stripe): add real Stripe price IDs to config"
```

---

## Task 3: Stripe webhook route

**Files:**
- Create: `app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Start Stripe CLI to get local webhook secret**

In a separate terminal (keep it running throughout development):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the `whsec_...` it prints → paste into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

- [ ] **Step 2: Create the webhook route**

Create `app/api/stripe/webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import supabaseAdmin from '@/libs/supabaseAdmin';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
  typescript: true,
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId = session.customer as string;

        if (!userId) {
          console.error('[webhook] checkout.session.completed: missing client_reference_id');
          break;
        }

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ plan: 'pro', customer_id: customerId })
          .eq('id', userId);

        if (error) {
          console.error('[webhook] Failed to upgrade profile:', error.message);
        } else {
          console.log(`[webhook] Upgraded user ${userId} to pro`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ plan: 'free' })
          .eq('customer_id', customerId);

        if (error) {
          console.error('[webhook] Failed to downgrade profile:', error.message);
        } else {
          console.log(`[webhook] Downgraded customer ${customerId} to free`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ plan: 'free' })
          .eq('customer_id', customerId);

        if (error) {
          console.error('[webhook] Failed to downgrade profile on payment failure:', error.message);
        } else {
          console.log(`[webhook] Downgraded customer ${customerId} to free (payment failed)`);
        }
        break;
      }

      default:
        // Ignore unhandled event types
        break;
    }
  } catch (err) {
    console.error('[webhook] Unhandled error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 3: Start dev server and verify webhook receives events**

```bash
npm run dev
```

In Stripe CLI terminal, trigger a test event:

```bash
stripe trigger checkout.session.completed
```

Expected in dev server logs: `[webhook] Upgraded user ... to pro` (will show `missing client_reference_id` since trigger uses dummy data — that's OK, means the route is reachable and signature passes).

- [ ] **Step 4: Commit**

```bash
git add app/api/stripe/webhook/route.ts
git commit -m "feat(stripe): add webhook route — checkout, subscription deleted, payment failed"
```

---

## Task 4: Update `createComponent` error code

**Files:**
- Modify: `app/actions/createComponent.ts:62-64`

The current error message is a human-readable string. We need a machine-readable code so `UploadSlideOver` can trigger the upgrade modal specifically.

- [ ] **Step 1: Replace the free limit error in `createComponent.ts`**

Find this block (around line 62):

```typescript
if (!isAdmin && profile?.plan === 'free' && (profile?.component_count ?? 0) >= 10) {
  throw new Error('Free plan limit reached. Upgrade to Pro for unlimited components.');
}
```

Replace with:

```typescript
if (!isAdmin && profile?.plan === 'free' && (profile?.component_count ?? 0) >= 10) {
  throw new Error('FREE_LIMIT_REACHED');
}
```

- [ ] **Step 2: Commit**

```bash
git add app/actions/createComponent.ts
git commit -m "feat(stripe): use FREE_LIMIT_REACHED error code for plan enforcement"
```

---

## Task 5: `UpgradeModal` component

**Files:**
- Create: `components/UpgradeModal.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client';

import Link from 'next/link';

interface Props {
  onClose: () => void;
}

export default function UpgradeModal({ onClose }: Props) {
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-bg border border-border shadow-2xl p-8 flex flex-col items-center text-center"
      >
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-accent-bg flex items-center justify-center mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-accent">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        <h2 id="upgrade-title" className="font-heading font-bold text-xl text-ink mb-2">
          You've reached the free limit
        </h2>
        <p className="text-sm text-ink-2 leading-relaxed mb-6">
          Free accounts can store up to <strong>10 components</strong>. Upgrade to Pro for unlimited storage and sharing.
        </p>

        {/* Pro highlight */}
        <div className="w-full rounded-xl bg-surface border border-border px-4 py-3 mb-6 text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="font-heading font-semibold text-ink">Pro</span>
            <span className="text-lg font-bold text-ink">$9<span className="text-sm font-normal text-ink-3">/mo</span></span>
          </div>
          <ul className="space-y-1.5">
            {['Unlimited components', 'Public & private sharing', 'Priority support'].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-ink-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-accent shrink-0">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/pricing"
          className="w-full flex items-center justify-center rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-3 text-sm transition-colors mb-3"
        >
          Upgrade to Pro
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-ink-3 hover:text-ink transition-colors"
        >
          Maybe later
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/UpgradeModal.tsx
git commit -m "feat(stripe): add UpgradeModal component"
```

---

## Task 6: Update `UploadSlideOver` — show modal on limit

**Files:**
- Modify: `components/UploadSlideOver.tsx`

- [ ] **Step 1: Add `showUpgradeModal` state and import UpgradeModal**

At the top of `UploadSlideOver.tsx`, add the import:

```typescript
import UpgradeModal from '@/components/UpgradeModal';
```

Inside the component, add state after the existing state declarations:

```typescript
const [showUpgradeModal, setShowUpgradeModal] = useState(false);
```

- [ ] **Step 2: Update the catch block in `handleSubmit` to detect `FREE_LIMIT_REACHED`**

Find the `catch` block in `handleSubmit` (around line 135):

```typescript
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
  toast.error(message);
  setIsSubmitting(false);
}
```

Replace with:

```typescript
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
  if (message === 'FREE_LIMIT_REACHED') {
    setShowUpgradeModal(true);
  } else {
    toast.error(message);
  }
  setIsSubmitting(false);
}
```

- [ ] **Step 3: Render the modal conditionally**

At the very end of the component's return statement, just before the closing `</>`, add:

```typescript
{showUpgradeModal && (
  <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
)}
```

The full return closing looks like:

```typescript
    </div>  {/* closes Panel div */}
    {showUpgradeModal && (
      <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
    )}
  </>
);
```

- [ ] **Step 4: Commit**

```bash
git add components/UploadSlideOver.tsx
git commit -m "feat(stripe): show UpgradeModal when FREE_LIMIT_REACHED"
```

---

## Task 7: `UpgradeBanner` component

**Files:**
- Create: `components/UpgradeBanner.tsx`

- [ ] **Step 1: Create the component**

```typescript
import Link from 'next/link';

interface Props {
  count: number;
  max?: number;
}

export default function UpgradeBanner({ count, max = 10 }: Props) {
  const pct = Math.round((count / max) * 100);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 flex items-center gap-4">
      {/* Progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-medium text-amber-900">
            {count}/{max} free components used
          </p>
          <span className="text-xs text-amber-700 font-medium">{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-amber-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* CTA */}
      <Link
        href="/pricing"
        className="shrink-0 rounded-lg bg-accent hover:bg-accent-h text-white text-xs font-semibold px-3 py-2 transition-colors"
      >
        Upgrade
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/UpgradeBanner.tsx
git commit -m "feat(stripe): add UpgradeBanner component"
```

---

## Task 8: Update `/dashboard` — show banner

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Read the current dashboard page**

Open `app/dashboard/page.tsx` and locate where it fetches the user profile (it reads `component_count` and `plan`).

- [ ] **Step 2: Import UpgradeBanner and render it conditionally**

At the top of the file, add:

```typescript
import UpgradeBanner from '@/components/UpgradeBanner';
```

In the JSX, after the page header and before the component list, add:

```typescript
{profile?.plan === 'free' && (profile?.component_count ?? 0) >= 8 && (
  <UpgradeBanner count={profile.component_count} />
)}
```

Place it so it appears prominently — directly under the `<h1>` or page intro section.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(stripe): show UpgradeBanner in dashboard when 8+/10 free components"
```

---

## Task 9: Pricing page

**Files:**
- Create: `app/pricing/page.tsx`

- [ ] **Step 1: Create the pricing page**

```typescript
import Link from 'next/link';
import { getSEOTags } from '@/libs/seo';
import config from '@/config';
import ButtonCheckout from '@/components/ButtonCheckout';

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
      <div
        className="mx-auto px-[var(--px-site)] py-20"
        style={{ maxWidth: 'var(--max-width)' }}
      >
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="font-heading font-bold text-4xl text-ink mb-4">
            Simple, honest pricing
          </h1>
          <p className="text-ink-2 text-lg max-w-md mx-auto">
            Free forever for casual makers. Pro for those who ship every day.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free plan */}
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

            <Link
              href="/dashboard"
              className="w-full flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-border text-ink font-medium px-4 py-3 text-sm transition-colors"
            >
              Get started free
            </Link>
          </div>

          {/* Pro plan */}
          <div className="rounded-2xl border-2 border-accent bg-bg p-8 flex flex-col relative overflow-hidden">
            {/* Popular badge */}
            <div className="absolute top-5 right-5">
              <span className="rounded-full bg-accent-bg text-accent text-xs font-semibold px-3 py-1">
                Most popular
              </span>
            </div>

            <div className="mb-6">
              <h2 className="font-heading font-bold text-xl text-ink mb-1">Pro</h2>
              <p className="text-ink-3 text-sm">{plan.description}</p>
            </div>

            <div className="mb-6 flex items-end gap-2">
              <span className="text-4xl font-bold text-ink">${plan.price}</span>
              <span className="text-ink-3 text-sm mb-1">/month</span>
              {plan.priceAnchor && (
                <span className="text-ink-3 text-sm line-through mb-1">${plan.priceAnchor}</span>
              )}
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

            <ButtonCheckout
              priceId={plan.priceId}
              mode="subscription"
            />

            <p className="mt-3 text-center text-xs text-ink-3">
              Cancel anytime. No lock-in.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-xl mx-auto mt-16 space-y-5">
          <h2 className="font-heading font-semibold text-xl text-ink text-center mb-8">Common questions</h2>
          {[
            {
              q: 'Can I cancel at any time?',
              a: 'Yes. Cancel from your billing portal and you keep Pro until the end of the billing period.',
            },
            {
              q: 'What happens to my components if I downgrade?',
              a: 'All your existing components stay. You just can\'t upload new ones beyond the 10-component free limit.',
            },
            {
              q: 'Is there a free trial?',
              a: 'The free plan is your trial — no time limit. Upgrade when you need more.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-border pb-5">
              <p className="font-medium text-ink mb-1.5">{q}</p>
              <p className="text-sm text-ink-2 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Fix `ButtonCheckout` — replace DaisyUI classes with design system**

Open `components/ButtonCheckout.tsx`. Replace the `<button>` element:

```typescript
return (
  <button
    className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-3 text-sm transition-colors disabled:opacity-60"
    onClick={() => handlePayment()}
    disabled={isLoading}
  >
    {isLoading ? (
      <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    ) : (
      'Upgrade to Pro'
    )}
  </button>
);
```

- [ ] **Step 3: Commit**

```bash
git add app/pricing/page.tsx components/ButtonCheckout.tsx
git commit -m "feat(stripe): add pricing page and fix ButtonCheckout classes"
```

---

## Task 10: Update `Header` — add Pricing link

**Files:**
- Modify: `components/Header.tsx:8-10`

- [ ] **Step 1: Add Pricing to navLinks**

Find the `navLinks` array (line 8-11):

```typescript
const navLinks = [
  { href: "/browse", label: "Browse" },
  { href: "/upload", label: "Upload" },
];
```

Replace with:

```typescript
const navLinks = [
  { href: "/browse", label: "Browse" },
  { href: "/upload", label: "Upload" },
  { href: "/pricing", label: "Pricing" },
];
```

- [ ] **Step 2: Commit**

```bash
git add components/Header.tsx
git commit -m "feat(stripe): add Pricing link to header navigation"
```

---

## Task 11: RGPD — Account deletion (right to erasure)

**Files:**
- Create: `app/actions/deleteAccount.ts`
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Create `deleteAccount` server action**

Create `app/actions/deleteAccount.ts`:

```typescript
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import supabaseAdmin from '@/libs/supabaseAdmin';

export async function deleteAccount(): Promise<void> {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) throw new Error('Unauthorized');

  const userId = session.user.id;

  // 1. Fetch all component IDs and their storage paths for cleanup
  const { data: components } = await supabaseAdmin
    .from('components')
    .select('id, json_path')
    .eq('user_id', userId);

  // 2. Delete all component JSON files from storage
  if (components && components.length > 0) {
    const jsonPaths = components.map((c) => c.json_path).filter(Boolean);
    if (jsonPaths.length > 0) {
      await supabaseAdmin.storage.from('components-json').remove(jsonPaths);
    }

    // Delete preview images (try both extensions)
    const imagePaths = components.flatMap((c) => [
      `${c.id}.jpg`,
      `${c.id}.png`,
    ]);
    await supabaseAdmin.storage.from('component-previews').remove(imagePaths);
  }

  // 3. Delete avatar from storage
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('avatar_url')
    .eq('id', userId)
    .single();

  if (profile?.avatar_url) {
    // Extract path from URL (format: .../avatars/{userId}/avatar.{ext})
    const match = profile.avatar_url.match(/avatars\/(.+)$/);
    if (match) {
      await supabaseAdmin.storage.from('avatars').remove([match[1]]);
    }
  }

  // 4. Delete DB rows — cascade deletes handle components, copies via FK
  // profiles delete last (FK refs to auth.users)
  await supabaseAdmin.from('copies').delete().eq('user_id', userId);
  await supabaseAdmin.from('components').delete().eq('user_id', userId);
  await supabaseAdmin.from('profiles').delete().eq('id', userId);

  // 5. Delete the Supabase auth user (requires service role)
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) {
    console.error('[deleteAccount] Failed to delete auth user:', authError.message);
    throw new Error('Failed to delete account. Please contact support.');
  }

  // 6. Sign out and redirect
  await supabase.auth.signOut();
  redirect('/');
}
```

- [ ] **Step 2: Read `app/settings/page.tsx` to find where to add the delete section**

Open `app/settings/page.tsx` and locate the end of the page content.

- [ ] **Step 3: Add "Danger zone" section to settings page**

At the bottom of the settings page JSX (before the closing tag of the main container), add:

```typescript
{/* Danger zone */}
<div className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6">
  <h2 className="font-heading font-semibold text-red-900 mb-1">Danger zone</h2>
  <p className="text-sm text-red-700 mb-4">
    Permanently delete your account and all associated data. This action cannot be undone.
  </p>
  <DeleteAccountButton />
</div>
```

Add the import at the top of the settings file:

```typescript
import DeleteAccountButton from '@/components/DeleteAccountButton';
```

- [ ] **Step 4: Create `DeleteAccountButton` client component**

Create `components/DeleteAccountButton.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { deleteAccount } from '@/app/actions/deleteAccount';

export default function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (err) {
      console.error(err);
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-red-300 bg-white text-red-700 hover:bg-red-50 font-medium px-4 py-2 text-sm transition-colors"
      >
        Delete my account
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-red-900">
        Are you sure? This will permanently delete all your components, data, and cancel your subscription.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 text-sm transition-colors disabled:opacity-60"
        >
          {deleting ? 'Deleting…' : 'Yes, delete everything'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-border bg-white text-ink font-medium px-4 py-2 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/actions/deleteAccount.ts components/DeleteAccountButton.tsx app/settings/page.tsx
git commit -m "feat(rgpd): add account deletion — right to erasure (Art. 17 RGPD)"
```

---

## Task 12: End-to-end manual test checklist

**Do this in order with the dev server + Stripe CLI both running.**

- [ ] **Test 1 — Free limit enforcement**
  1. Log in with a test account that has 10 components
  2. Try to upload an 11th component
  3. Expected: `UpgradeModal` appears (not a toast error)
  4. Click "Upgrade to Pro" → lands on `/pricing`

- [ ] **Test 2 — Dashboard banner**
  1. Log in with a test account that has 8 or 9 components
  2. Visit `/dashboard`
  3. Expected: `UpgradeBanner` appears with progress bar

- [ ] **Test 3 — Stripe checkout flow**
  1. Visit `/pricing`
  2. Click "Upgrade to Pro"
  3. Expected: redirects to Stripe Checkout (test mode)
  4. Use card `4242 4242 4242 4242`, any expiry/CVC
  5. Complete payment
  6. Expected: redirects back, Stripe CLI logs `checkout.session.completed`
  7. Check Supabase `profiles` table: `plan = 'pro'`, `customer_id` set

- [ ] **Test 4 — Pro upload works**
  1. Same account after upgrading
  2. Upload a component beyond 10
  3. Expected: works without modal

- [ ] **Test 5 — Subscription cancellation**
  1. In Stripe Dashboard (test mode) → Customers → find test customer → Cancel subscription
  2. Expected: Stripe CLI logs `customer.subscription.deleted`
  3. Check Supabase `profiles`: `plan = 'free'`

- [ ] **Test 6 — Customer portal**
  1. Log in as Pro user
  2. Click account menu (top right) → Billing
  3. Expected: redirects to Stripe Customer Portal

- [ ] **Test 7 — Account deletion**
  1. Log in as any user → Settings → Delete my account
  2. Confirm
  3. Expected: all data gone from Supabase, redirected to home, can't log back in with same account

---

## Task 13: Push and open PR

- [ ] **Step 1: Push feature branch**

```bash
git push -u origin feature/stripe
```

- [ ] **Step 2: Add Stripe live keys to Vercel**

In Vercel dashboard → Settings → Environment Variables:
- `STRIPE_SECRET_KEY` = `sk_live_...`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
- `STRIPE_WEBHOOK_SECRET` = `whsec_...` (from Stripe Dashboard webhook, NOT the CLI one)

- [ ] **Step 3: Register production webhook in Stripe Dashboard**

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://flowvault-ten.vercel.app/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
- Copy signing secret → Vercel `STRIPE_WEBHOOK_SECRET`

- [ ] **Step 4: Open PR on GitHub**

```bash
gh pr create --title "feat: Stripe Pro subscriptions (Phase 3)" \
  --body "Adds webhook, pricing page, upgrade modal, banner, enforcement and RGPD account deletion. See spec: docs/superpowers/specs/2026-04-04-stripe-phase3-design.md"
```

- [ ] **Step 5: After merge to main, run full test checklist with live Stripe keys**

---

## RGPD notes (code audit summary)

**Compliant already:**
- Passwords hashed (bcrypt) ✅
- RLS on all tables ✅
- Plausible analytics — no cookie consent needed ✅
- `supabaseAdmin` never exposed client-side ✅
- Signed URLs for private storage ✅

**Added by this plan:**
- Right to erasure (Art. 17) — `deleteAccount` action ✅

**Still missing (separate plan — needs your legal info first):**
- Privacy policy updated for FlowVault (currently ShipFast's)
- Terms of Service updated for FlowVault
- Mentions légales page (required by French LCEN law)
- Right to data portability (Art. 20) — data export feature (lower priority)
