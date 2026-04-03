# FlowVault — User Profile & Settings Spec

**Date:** 2026-04-03
**Status:** Draft — to be implemented in Phase 2
**Language:** All UI text in English

---

## Overview

Two new pages:

- `/settings` — authenticated user edits their profile info
- `/u/[username]` — public profile page showing all public components from a user

---

## 1. Settings Page (`/settings`)

### Layout

```
Header (nav)
─────────────────────────────────────
Settings

┌─────────────────────────────────────┐
│ Profile                             │
│                                     │
│ [Avatar]  Display name              │
│           [___________________]     │
│                                     │
│           Username                  │
│           [___________________]     │
│           flowvault.io/u/username   │
│                                     │
│           Bio                       │
│           [___________________]     │
│           [textarea, max 160 chars] │
│                                     │
│           Website                   │
│           [___________________]     │
│                                     │
│                      [Save changes] │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Account                             │
│                                     │
│ Email    you@example.com (readonly) │
│ Plan     Free  [Upgrade →]          │
│                                     │
│                        [Sign out]   │
└─────────────────────────────────────┘

Footer
```

### Fields

| Field | Source | Constraints |
|---|---|---|
| Display name | `profiles.display_name` | max 50 chars |
| Username | `profiles.username` | max 30 chars, lowercase, alphanumeric + hyphens, unique |
| Bio | `profiles.bio` | max 160 chars |
| Website | `profiles.website` | valid URL or empty |
| Email | `auth.users.email` | readonly (set by Supabase auth) |
| Plan | `profiles.plan` | readonly display |

### Database changes

```sql
-- Add to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
```

### Avatar

- Display current avatar (from `profiles.avatar_url` or `auth.users.user_metadata.avatar_url` as fallback)
- Phase 2: allow upload (Supabase Storage bucket `avatars`, public)
- For now: read-only, shows Google avatar if OAuth

### Username rules

- Lowercase, alphanumeric + hyphens only: `/^[a-z0-9-]+$/`
- Min 3 chars, max 30 chars
- Unique across all users
- Used in public profile URL: `/u/[username]`
- Auto-suggested from display name on first save (if empty)

### Server Action: `updateProfile`

```typescript
// Validates and updates profiles row for authenticated user
// Checks username uniqueness before saving
// revalidatePath('/settings') + revalidatePath('/u/[username]')
```

---

## 2. Public Profile Page (`/u/[username]`)

### Layout

```
Header (nav)
─────────────────────────────────────
[Avatar large]  Display name
                @username
                Bio text here
                [website link]

                X components · X total copies

┌──────────────────────────────────────┐
│ [thumb]  Hero Section   hero · 24 copies │
│ [thumb]  Pricing Table  pricing · 8 copies │
└──────────────────────────────────────┘

Footer
```

### Data fetching

Server component. Two parallel queries:

```typescript
// 1. Fetch profile by username
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('id, display_name, username, bio, website, avatar_url, plan')
  .eq('username', username)
  .single();

// 2. Fetch public components
const { data: components } = await supabaseAdmin
  .from('components')
  .select('id, name, slug, category, image_url, copy_count, created_at')
  .eq('user_id', profile.id)
  .eq('is_public', true)
  .eq('is_temporary', false)
  .order('created_at', { ascending: false });
```

### Component card (read-only)

Each component shows:
- Thumbnail (image_url or placeholder)
- Name + category badge + copy_count
- Link to `/c/[slug]`

No inline actions (this is a public view, not the owner's dashboard).

### 404 handling

If username doesn't exist → `notFound()`

---

## Files to create

| File | Action |
|---|---|
| `app/settings/page.tsx` | New — settings form (server component + client form) |
| `app/actions/updateProfile.ts` | New — validate + save profile fields |
| `app/u/[username]/page.tsx` | New — public profile page |
| `components/ProfileComponentCard.tsx` | New — read-only component card for profile page |

---

## Watch out

- **Username uniqueness**: check in Server Action before saving, return user-facing error if taken
- **Username in URL**: once set, changing it breaks existing `/u/[username]` links — warn user in UI
- **Avatar fallback chain**: `profiles.avatar_url` → `user_metadata.avatar_url` (Google) → initials
- **Own profile link**: when logged in, header could show link to `/u/[username]` if username is set
- **Stats**: show total `copy_count` as sum of all public components on the profile page
