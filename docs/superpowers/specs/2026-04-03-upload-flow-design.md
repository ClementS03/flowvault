# FlowVault — Upload Flow Design Spec

**Date:** 2026-04-03
**Status:** Approved
**Language:** All UI text in English

---

## Overview

The upload flow is the core of FlowVault. Anyone (logged in or not) can paste a Webflow component, configure it, and immediately get a share link + "Copy to Webflow" button — no friction. Sign-in is offered afterwards to store the component permanently.

---

## Full flow

```
/upload
  └─ Paste detected (paste event, MIME application/json, type @webflow/XscpData)
       └─ Slide-over opens (configuration form)
            └─ Form submit
                 ├─ [not logged in] → create temporary component (DB, expires 24h)
                 │                  → redirect /upload/result?slug=xxx
                 │                      Result page:
                 │                        [component card] | OR | [sign-in form]
                 │                        On sign-in success → component claimed by user
                 │                                           → redirect /dashboard
                 └─ [logged in]     → create permanent component in DB
                                    → redirect /c/[slug]
```

---

## Step 1 — Paste zone (`/upload`)

### Behavior
- Accessible without auth — anyone can test the upload flow.
- Paste zone listens to the `paste` event on `window` (not just the div).
- Validation: `clipboardData.getData('application/json')` → parse JSON → check `data.type === '@webflow/XscpData'`.
- If invalid: error toast "That doesn't look like a Webflow component. Copy an element from the Designer first."
- If valid: open slide-over with JSON stored in React state.

### UI text
- Heading: "Upload a component"
- Subtitle: "Copy any element from the Webflow Designer (Ctrl+C), then paste it here (Ctrl+V)"
- Paste zone: "Paste your Webflow component here" / "Press Ctrl+V after copying from the Designer"
- Success state: "Component detected — {N} elements"

---

## Step 2 — Configuration slide-over

### Behavior
- Opens from the right on desktop (width ~480px), full-screen on mobile.
- Semi-transparent overlay behind it; click outside = close + reset.
- Closing loses the JSON (user must paste again).

### Form fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | text | Yes | max 60 chars |
| `description` | textarea | No | max 200 chars |
| `category` | select | No | hero, navbar, pricing, footer, feature, card, other |
| `tags` | text (comma-separated) | No | max 5 tags |
| `preview_image` | file upload | No | JPEG/PNG, max 2MB, immediate preview |
| `is_public` | toggle switch | Yes | default: true |
| `password` | text (conditional) | No | shown only when is_public = false |

### UI text
- Slide-over title: "Configure your component"
- Submit button (logged in): "Publish component"
- Submit button (not logged in): "Get share link"
- Password field label: "Password protect"
- Password field placeholder: "Set a password"
- is_public label: "Make public"

### Submit
- If is_public = false and password provided: hash password (bcrypt) server-side before storing.
- Server Action: `createComponent(formData, json, userId | null)`

---

## Step 3 — Temporary storage (unauthenticated user)

### DB
Two new columns on the `components` table:
```sql
is_temporary  boolean      default false
expires_at    timestamptz  nullable
```

### Server Action logic
```
if (userId) {
  INSERT components { user_id, ..., is_temporary: false, expires_at: null }
  redirect /c/[slug]
} else {
  INSERT components { user_id: null, ..., is_temporary: true, expires_at: now + 24h }
  redirect /upload/result?slug=[slug]
}
```

### RLS
- Policy "Anyone can insert": `with check (true)` — allows inserts without auth.
- Policy "Public read": `using (is_public = true OR expires_at > now())`.
- Policy "Own read": `using (auth.uid() = user_id)`.

### Cleanup
Supabase pg_cron job — runs every hour:
```sql
DELETE FROM components WHERE is_temporary = true AND expires_at < now();
```

---

## Step 4 — Result page (`/upload/result?slug=xxx`)

### Desktop layout
```
┌─────────────────────┬────┬─────────────────────┐
│   Component card    │ OR │   Sign-in form       │
│                     │    │                      │
│  [Preview image]    │    │  • Google button     │
│  Component name     │    │  • ─── or ───        │
│  [Share link]       │    │  • Magic link email  │
│  [Copy to Webflow]  │    │                      │
│  ⚠ Expires in ~24h  │    │  Benefits list       │
└─────────────────────┴────┴─────────────────────┘
```

### Mobile layout
- Component card on top.
- Horizontal "— OR —" divider.
- Sign-in form below.

### Component card UI text
- "Your component is ready"
- Share link field with copy-to-clipboard button ("Copy link")
- Primary button: "Copy to Webflow"
- Expiry notice: "This link expires in ~24h. Sign in to store it permanently."

### Sign-in panel UI text
- Title: "Save it forever"
- Benefits:
  - "Permanent share link"
  - "Track how many times it's been copied"
  - "Up to 10 free components"
- Google button: "Continue with Google"
- Magic link button: "Send Magic Link"

### After sign-in on this page
- Auth callback (`/api/auth/callback`) receives the slug via `redirectTo` query param.
- After code exchange, Server Action `claimComponent(slug, userId)`:
  - `UPDATE components SET user_id = userId, is_temporary = false, expires_at = null WHERE slug = slug AND user_id IS NULL`
- Redirect `/dashboard`.

---

## Step 5 — Logged-in user

- Slide-over detects session client-side (Supabase `createClientComponentClient`).
- Submit button shows "Publish component".
- After submit → redirect directly to `/c/[slug]`.
- No intermediate result page.

---

## Files to create / modify

| File | Role |
|---|---|
| `app/upload/page.tsx` | Paste zone (client component), window paste event |
| `components/UploadSlideOver.tsx` | Slide-over with form + image preview |
| `app/upload/result/page.tsx` | Result page (card + OR + sign-in) |
| `app/actions/createComponent.ts` | Server Action: validate, store JSON, insert DB |
| `app/actions/claimComponent.ts` | Server Action: link temp component to user |
| `app/api/auth/callback/route.ts` | Pass slug param through if present |
| `libs/slugify.ts` | Generate `{name-slug}-{6chars}` |
| `libs/hashPassword.ts` | bcrypt hash for password protection |

---

## DB schema (delta)

```sql
ALTER TABLE public.components
  ADD COLUMN is_temporary boolean DEFAULT false,
  ADD COLUMN expires_at timestamptz;

CREATE POLICY "Anyone can insert component"
  ON public.components FOR INSERT
  WITH CHECK (true);

-- pg_cron cleanup (enable extension in Supabase dashboard first)
SELECT cron.schedule(
  'cleanup-temp-components',
  '0 * * * *',
  $$DELETE FROM components WHERE is_temporary = true AND expires_at < now()$$
);
```

---

## Watch out

- **Paste event**: listen on `window`. Skip if an `<input>` or `<textarea>` is focused to avoid conflicts.
- **Slide-over mobile**: `position: fixed; inset: 0` on mobile (< 768px), `right: 0; top: 0; bottom: 0; width: 480px` on desktop.
- **Image storage**: Supabase Storage bucket `component-previews` (public), path `{component_id}.jpg`. No image provided → generic placeholder.
- **Password**: never store plaintext. Hash bcrypt server-side in the Server Action.
- **Claim callback**: if no slug in the callback query params, normal behavior (redirect `/dashboard`).
- **RLS**: the "Anyone can insert" policy must not allow the client to set `user_id` directly — enforce it server-side only.
