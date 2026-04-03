# FlowVault — Dashboard Design Spec

**Date:** 2026-04-03
**Status:** Approved
**Language:** All UI text in English

---

## Overview

The dashboard (`/dashboard`) is the authenticated user's component library. It shows all their uploaded components in a compact list view with inline actions, a plan progress bar, and an upload CTA.

---

## Layout

```
Header (nav)
─────────────────────────────────────────────────────
My library                          [Upload component]

▓▓▓░░░░░░░  3 / 10 components · Free plan  [Upgrade →]

┌──────────────────────────────────────────────────┐
│ [thumb]  Hero Section    hero · 24 copies · Public│
│  ⎘ Copy link  ⬇ Copy to Webflow  👁  →  🗑      │
├──────────────────────────────────────────────────┤
│ [thumb]  Pricing Table   pricing · 8 copies       │
│  ⎘ Copy link  ⬇ Copy to Webflow  👁  →  🗑      │
└──────────────────────────────────────────────────┘

[empty state if no components]

Footer
```

---

## Data fetching

Server component. Two parallel queries via `supabaseAdmin` (service role — bypasses RLS, safe server-side):

```typescript
const [{ data: components }, { data: profile }] = await Promise.all([
  supabaseAdmin
    .from('components')
    .select('id, name, slug, category, image_url, is_public, copy_count, created_at, json_path')
    .eq('user_id', userId)
    .eq('is_temporary', false)
    .order('created_at', { ascending: false }),

  supabaseAdmin
    .from('profiles')
    .select('plan, component_count')
    .eq('id', userId)
    .single(),
]);
```

Session retrieved via `createServerComponentClient` in the page (layout already guards auth).

---

## Plan progress bar

```
▓▓▓░░░░░░░  3 / 10 components · Free plan   [Upgrade →]
```

- Shows `component_count / 10` for free plan users
- Progress bar fills proportionally (capped at 100%)
- "Upgrade →" links to `/pricing` (Phase 3 — renders as plain text link for now)
- Hidden for Pro plan users (or shows "Pro · Unlimited")

---

## Component row — `ComponentRow` client component

Each row displays:
- Thumbnail (`image_url` if set, else placeholder icon)
- Name + category badge + copy_count + public/private badge
- 5 inline actions:

| Action | Behavior |
|---|---|
| **Copy link** | `navigator.clipboard.writeText(shareUrl)` → toast "Link copied!" |
| **Copy to Webflow** | Fetches signed URL on demand, calls `copyToWebflow()` synchronously |
| **Toggle public/private** | Calls `togglePublic(id, !is_public)` Server Action → optimistic UI update |
| **View** | `<a href="/c/[slug]" target="_blank">` |
| **Delete** | `window.confirm()` → calls `deleteComponent(id)` Server Action → removes row |

`ComponentRow` receives the signed JSON URL as a prop (pre-generated server-side, 1h TTL) so Copy to Webflow works without an extra fetch-for-URL step.

---

## Server Actions

### `deleteComponent(id: string): Promise<void>`

1. Verify ownership: fetch component, check `user_id === session.user.id` (via `createServerActionClient`)
2. Delete Storage files in parallel: `components-json/{path}` + `component-previews/{id}.*` if exists
3. DELETE from `components` table
4. Decrement `profiles.component_count`
5. `revalidatePath('/dashboard')`

### `togglePublic(id: string, isPublic: boolean): Promise<void>`

1. Verify ownership
2. UPDATE `components SET is_public = isPublic WHERE id = id`
3. `revalidatePath('/dashboard')`

---

## Empty state

When `components.length === 0`:

```
[icon]
No components yet
Upload your first Webflow component to get started
[Upload component]
```

---

## Files

| File | Action |
|---|---|
| `app/dashboard/page.tsx` | Rewrite — fetch components + profile, render list |
| `app/actions/deleteComponent.ts` | New — ownership check, Storage cleanup, DB delete |
| `app/actions/togglePublic.ts` | New — ownership check, update is_public |
| `components/ComponentRow.tsx` | New — client component, all 5 inline actions |

---

## Watch out

- **Ownership**: always verify `user_id === session.user.id` in Server Actions before any mutation — never trust the component `id` from the client alone.
- **Storage cleanup on delete**: delete both the JSON file (`components-json`) and the preview image (`component-previews`) if it exists. Image path is `{id}.jpg` or `{id}.png` — try both.
- **component_count**: decrement on delete (mirrors the increment in `createComponent`).
- **Optimistic UI for toggle**: `ComponentRow` maintains local `isPublic` state for instant feedback; the Server Action confirms in background.
- **Signed URLs**: generated server-side in `page.tsx` for each component (1h TTL). Passed as prop to `ComponentRow` so Copy to Webflow is synchronous on click.
- **Temporary components**: excluded from the dashboard query (`is_temporary = false`). Claimed components appear after sign-in.
