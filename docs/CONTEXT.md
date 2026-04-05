# FlowVault — Project Context

> Quick reference for picking up this project. Full details in `CLAUDE.md`.

## Current state (2026-04-05)

Phase 1 through 1g is **complete and deployed** at `https://flowvault-ten.vercel.app`.
Stripe is live. Resend uses `onboarding@resend.dev` (test only — verify a real domain to send to all users).

## What's built

| Feature | Status | Key files |
|---|---|---|
| Auth (Google OAuth + Magic Link) | ✅ | `app/signin`, `app/api/auth/callback/route.ts` |
| Upload component (paste Webflow JSON) | ✅ | `app/upload`, `app/actions/createComponent.ts` |
| Dashboard / library | ✅ | `app/dashboard` |
| Browse marketplace (guests: 10 max, overlay CTA) | ✅ | `app/browse/page.tsx` |
| Component page `/c/[slug]` (guests CAN copy public) | ✅ | `app/c/[slug]/page.tsx` |
| Copy to Webflow (native clipboard) | ✅ | `components/CopyToWebflowButton.tsx` |
| Public profile `/u/[username]` (requires login) | ✅ | `app/u/[username]/page.tsx` |
| Onboarding + username live check | ✅ | `app/onboarding/page.tsx`, `app/api/check-username/route.ts` |
| Stripe Pro (live mode) | ✅ | `app/api/stripe`, `config.ts` |
| Admin moderation `/admin` | ✅ | `app/admin/page.tsx`, `app/admin/ModerationActions.tsx` |
| Moderation server actions | ✅ | `app/actions/moderateComponent.ts` |
| HTML branded emails | ✅ | `libs/emailTemplates.ts`, `libs/sendEmail.ts` |
| Welcome email on signup | ✅ | `app/api/auth/callback/route.ts` |
| Admin notified on new signup | ✅ | `app/api/auth/callback/route.ts` |
| Security headers | ✅ | `next.config.js` |
| Legal pages (FR auto-entrepreneur) | ✅ | `app/legal`, `app/tos`, `app/privacy-policy` |
| Vercel Analytics | ✅ | `app/layout.tsx` |

## Access control rules

| Page / endpoint | Guest | Logged in |
|---|---|---|
| `/browse` | 10 components, no copy | All components + copy |
| `/c/[slug]` (public component) | CAN copy | CAN copy |
| `/c/[slug]` (private component) | 404 (if not owner/password) | Copy if owner |
| `/u/[username]` | Redirect to `/signin` | View profile |
| `/admin` | Next.js 404 page | Only if in `ADMIN_EMAILS` |
| `POST /api/components/[id]/copy` | OK for public, 401 for private | OK |

## Moderation status flow

```
null → publish → is_public=true
admin unpublishes → is_public=false, moderation_status='rejected'
user re-publishes → is_public=false, moderation_status='pending_review'
admin approves → is_public=true, moderation_status='approved'
```

## Environment variables (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY                  # live: sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY # live: pk_live_xxx
NEXT_PUBLIC_STRIPE_PRICE_ID        # live: price_1TIQydIEMd7KisSxLz3c1CnH
STRIPE_WEBHOOK_SECRET              # live webhook signing secret
RESEND_API_KEY                     # re_xxx
EMAIL_FROM                         # contact@clement-seguin.fr
ADMIN_EMAILS                       # clement.seguin63@gmail.com (comma-separated)
NEXT_PUBLIC_APP_URL                # https://flowvault-ten.vercel.app
```

## Pending SQL migration (Supabase)

If not already done:
```sql
-- moderation columns (required for admin panel)
ALTER TABLE public.components
  ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS moderation_note text DEFAULT NULL;

-- private profile by default for new users
ALTER TABLE public.profiles ALTER COLUMN is_private SET DEFAULT true;
```

## Resend domain

Currently using `onboarding@resend.dev` → can only send to the Resend account owner's email.
To send to all users: verify a real domain (e.g. `flowvault.io`) in Resend Dashboard, then update `EMAIL_FROM`.

## Next phases

**Phase 2 — Marketplace & Discovery**
Browse: full-text search, category/tag filters, sort (trending, newest), favorites.
Brainstorm before implementing.

**Phase 2b — Social Graph**
Follow/unfollow, saved components, `follows` table, `saves` table, privacy enforcement.
Brainstorm before implementing.

**Phase 3 — Stripe (already wired)**
Enforce free limit (10 components), upgrade flow, billing portal. ShipFast webhooks are in place.

## Key architectural rules

- Never write `React.Xxx` in `.tsx` — always import types directly from `'react'`
- All tables have RLS. Never bypass with service role key client-side.
- `components-json` bucket = private. Access via signed URLs (server-side only).
- `ADMIN_EMAILS` is the single source of truth for admin access.
- `/admin` is protected at page level via `notFound()` — NOT in middleware (to show the app's 404 page).
- Category is required to make a component public.
- No AI co-author lines in commits.
