# Profile UX Redesign + Avatar Upload Design

## Goal

Redesign the public profile page (`/u/[username]`) with a two-column layout, add custom avatar upload in Settings, and add a private profile toggle.

## Architecture

The profile page is a Server Component that fetches profile data and components. The layout switches between a two-column sidebar layout (desktop) and a stacked single-column layout (mobile) via Tailwind responsive classes. Avatar upload is handled by a new Client Component in Settings that uploads directly to a public Supabase Storage bucket (`avatars`) and saves the URL to `profiles.avatar_url`. Privacy is controlled by a new `is_private` boolean on `profiles`.

## Tech Stack

Next.js 14 App Router · Supabase Storage · Tailwind CSS · Server Components · Server Actions

---

## Section 1 — Profile Page Layout (`/u/[username]`)

### Desktop (≥ 768px) — Two-column layout

```
┌──────────────────────────────────────────────────────┐
│ Nav                                                   │
├──────────────────────────────────────────────────────┤
│  [Sidebar 220px]          [Main — flex: 1]           │
│  ┌─────────────────┐      ┌────────────────────────┐ │
│  │ Avatar          │      │ Public components       │ │
│  │ Display name    │      │                         │ │
│  │ @username       │      │  [card] [card]          │ │
│  │ Bio             │      │  [card] [card]          │ │
│  │ Website link    │      │  [card] [card]          │ │
│  │ [Follow button] │      └────────────────────────┘ │
│  └─────────────────┘                                  │
│  ┌─────────────────┐                                  │
│  │ Stats           │                                  │
│  │ Components: 12  │                                  │
│  │ Total copies: X │                                  │
│  │ Member since: X │                                  │
│  └─────────────────┘                                  │
└──────────────────────────────────────────────────────┘
```

**Sidebar cards:**
- Card 1: avatar, display name, @username, bio, website link, Follow button (hidden on own profile, visible on others')
- Card 2: stats — component count, total copies, member since (formatted as "Apr 2026")

**Components grid:** 2 columns, each card has thumbnail (80px tall, `bg-accent-bg` placeholder if no image), component name, category badge, copy count.

### Mobile (< 768px) — Stacked single-column

Profile info centered at top (avatar centered, name, @username, bio, stats inline), then components in 2-column grid below. No sidebar. Follow button below stats if viewing another's profile.

### Viewing another's profile

The Follow button appears in the sidebar card 1 (desktop) or below stats (mobile). In Spec 1 it is a placeholder button — it records nothing yet (social graph is Spec 2). It can be styled as active (disabled, text "Follow — coming soon") or hidden entirely until Spec 2. **Decision: hide the Follow button until Spec 2.** Stats sidebar shows their stats only (no follower count yet).

### Private profile (Option A)

When `profiles.is_private = true`:
- `/u/[username]` renders a locked state: avatar (or initials) + display name + "🔒 This profile is private" message
- No components listed
- No bio/website/stats shown
- Public component links (`/c/slug`) still work normally — privacy only gates the profile page

---

## Section 2 — Avatar Upload (Settings)

### Storage

New Supabase Storage bucket: `avatars` — **public** (avatars are public by design).

Path: `avatars/{userId}/{timestamp}.{ext}`

Using timestamp in filename avoids cache collisions when the user re-uploads.

### Accepted files

- Formats: JPG, PNG, WebP
- Max size: 2 MB
- Validated client-side before upload (fast feedback), re-validated server-side in the Server Action

### UX flow

1. In Settings (edit mode), the avatar displays with a camera icon overlay on hover
2. Clicking the overlay or the "Upload photo" button opens a native `<input type="file" accept="image/jpeg,image/png,image/webp">`
3. On file select: validate format + size client-side → show progress bar → upload to Supabase Storage → save URL to `profiles.avatar_url` via Server Action → toast "Avatar updated"
4. "Remove" button sets `profiles.avatar_url = null` → falls back to Google avatar or initials

### Upload states

| State | Visual |
|---|---|
| Default | Avatar (Google or initials) with camera overlay on hover |
| Uploading | Spinner overlay on avatar + progress bar below |
| Success | New avatar shown + toast "Avatar updated" |
| Error: size | Red error message "File too large. Max 2 MB." |
| Error: format | Red error message "Only JPG, PNG, WebP accepted." |

### Priority

Custom `profiles.avatar_url` (if set) takes priority over Google OAuth `user_metadata.avatar_url` in all places where the avatar is displayed (profile page, Settings, nav dropdown).

---

## Section 3 — Private Profile Toggle (Settings)

### DB change

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;
```

### UX

In Settings > Account section, below the Plan row:

```
Private profile                          [toggle OFF]
Hide your profile page from other users.
Your public component links still work.
```

Toggle is a Client Component. On change → Server Action `updatePrivacy(userId, isPrivate)` → updates `profiles.is_private` → revalidates `/u/[username]`.

The toggle saves immediately on change (no separate Save button), with a subtle "Saved" confirmation that fades out.

---

## DB Changes Summary

```sql
-- 1. Add is_private to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;

-- 2. Add avatar columns if not already present
-- (avatar_url already exists from previous spec — no change needed)

-- 3. Create avatars bucket (in Supabase dashboard or via migration)
-- Bucket name: avatars
-- Public: YES
-- Allowed MIME types: image/jpeg, image/png, image/webp
-- Max file size: 2097152 (2 MB)
```

### RLS for avatars bucket

```sql
-- Anyone can read (public bucket)
-- Only owner can upload/delete their own avatar
CREATE POLICY "Avatar upload own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Avatar delete own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Files Created / Modified

| File | Action | Responsibility |
|---|---|---|
| `app/u/[username]/page.tsx` | Modify | Two-column layout, private profile gate, responsive |
| `components/ProfileComponentCard.tsx` | Modify | Card format (thumbnail 80px, 2-col grid) |
| `components/AvatarUpload.tsx` | Create | Client component — file input, upload states, progress |
| `components/PrivacyToggle.tsx` | Create | Client component — toggle with instant save |
| `components/SettingsForm.tsx` | Modify | Add AvatarUpload + PrivacyToggle, remove avatar note |
| `app/actions/updateProfile.ts` | Modify | Handle avatar_url removal ("Remove" button) |
| `app/actions/updatePrivacy.ts` | Create | Server Action — update is_private |

---

## What This Spec Does NOT Cover (Spec 2 — Social Graph)

- Follow/unfollow button (functional)
- `follows` table
- Saved/bookmarked components
- `saves` table
- Sidebar: following list, saved components list
- Follower/following counts on profile
- Browse: hide private-profile users' components

See roadmap: **Phase 2b — Social Graph**
