# Profile UX + Avatar Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the public profile page with a two-column layout, add custom avatar upload in Settings, and add a private profile toggle.

**Architecture:** The profile page (`/u/[username]`) is a Server Component that renders a two-column layout on desktop (sidebar with profile info + stats, main with 2-col component grid) and a stacked layout on mobile. Avatar upload is client-side to Supabase Storage (`avatars` public bucket) with the resulting URL persisted via a Server Action. Privacy is a toggle in Settings that sets `profiles.is_private`.

**Tech Stack:** Next.js 14 App Router · Supabase Auth Helpers · Supabase Storage · Tailwind CSS · react-hot-toast

> **Note:** No test framework exists in this codebase. Each task uses `rtk npx tsc --noEmit` as the verification step instead of unit tests.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/u/[username]/page.tsx` | Modify | Two-column layout, private profile gate, responsive mobile |
| `components/ProfileComponentCard.tsx` | Modify | Grid card (80px thumbnail, name, badge, copy count) |
| `app/actions/updateAvatar.ts` | Create | Server Action — save/clear avatar URL in profiles |
| `components/AvatarUpload.tsx` | Create | Client component — file input, upload to Storage, progress states |
| `app/actions/updatePrivacy.ts` | Create | Server Action — update is_private on profiles |
| `components/PrivacyToggle.tsx` | Create | Client component — instant-save toggle |
| `components/SettingsForm.tsx` | Modify | Add AvatarUpload + PrivacyToggle, track live avatar URL |
| `app/settings/page.tsx` | Modify | Fetch is_private + created_at, pass to SettingsForm |

---

## Task 1: DB + Storage Setup

**Files:**
- No code files — Supabase dashboard + SQL Editor

- [ ] **Step 1: Add `is_private` column to profiles**

In the Supabase dashboard → SQL Editor, run:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;
```

Expected: "Success. No rows returned."

- [ ] **Step 2: Create the `avatars` Storage bucket**

In Supabase dashboard → Storage → New bucket:
- Name: `avatars`
- Public bucket: **YES** (toggle on)
- Allowed MIME types: `image/jpeg, image/png, image/webp`
- Max upload size: `2` MB

Click "Save".

- [ ] **Step 3: Add RLS policies for the avatars bucket**

In the Supabase dashboard → SQL Editor, run:

```sql
CREATE POLICY "Avatar upload own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Avatar delete own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

Expected: "Success. No rows returned." for each.

- [ ] **Step 4: Verify**

In the Supabase dashboard → Storage → `avatars` bucket → Policies, confirm you see "Avatar upload own" and "Avatar delete own".

---

## Task 2: Profile Page Redesign

**Files:**
- Modify: `app/u/[username]/page.tsx`

- [ ] **Step 1: Rewrite `app/u/[username]/page.tsx`**

Replace the entire file with:

```typescript
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProfileComponentCard from '@/components/ProfileComponentCard';
import supabaseAdmin from '@/libs/supabaseAdmin';

interface Props {
  params: { username: string };
}

export const dynamic = 'force-dynamic';

export default async function UserProfilePage({ params }: Props) {
  const { username } = params;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, username, bio, website, avatar_url, is_private, created_at')
    .eq('username', username)
    .single();

  if (!profile) notFound();

  const displayName = profile.display_name || profile.username || 'Anonymous';
  const initials = displayName.charAt(0).toUpperCase();

  const avatarEl = (size: 'sm' | 'lg') => {
    const cls = size === 'lg'
      ? 'w-16 h-16 rounded-full object-cover'
      : 'w-20 h-20 rounded-full object-cover';
    const initCls = size === 'lg'
      ? 'w-16 h-16 rounded-full bg-accent-bg flex items-center justify-center text-accent font-heading font-bold text-xl'
      : 'w-20 h-20 rounded-full bg-accent-bg flex items-center justify-center text-accent font-heading font-bold text-2xl';

    return profile.avatar_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt={displayName}
        className={cls}
        referrerPolicy="no-referrer"
      />
    ) : (
      <div className={initCls}>{initials}</div>
    );
  };

  // Private profile gate
  if (profile.is_private) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center px-[var(--px-site)]">
          <div className="text-center">
            <div className="mx-auto mb-4">{avatarEl('sm')}</div>
            <h1 className="font-heading text-xl font-bold text-ink mb-1">{displayName}</h1>
            <p className="text-sm text-ink-3 mb-6">@{profile.username}</p>
            <div className="inline-flex items-center gap-2 bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-ink-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ink-3">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
              </svg>
              This profile is private
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { data: components } = await supabaseAdmin
    .from('components')
    .select('id, name, slug, category, image_url, copy_count, created_at')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .eq('is_temporary', false)
    .order('created_at', { ascending: false });

  const totalCopies = (components ?? []).reduce((sum, c) => sum + (c.copy_count ?? 0), 0);

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main
        className="flex-1 mx-auto w-full px-[var(--px-site)] py-12"
        style={{ maxWidth: 'var(--max-width)' }}
      >
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Sidebar */}
          <aside className="w-full md:w-56 flex-shrink-0 flex flex-col gap-4">
            {/* Profile card */}
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1">
                <div className="mb-3">{avatarEl('lg')}</div>
                <h1 className="font-heading font-bold text-ink text-base leading-tight">
                  {displayName}
                </h1>
                <p className="text-sm text-ink-3">@{profile.username}</p>
                {profile.bio && (
                  <p className="text-sm text-ink-2 mt-2 leading-relaxed">{profile.bio}</p>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:text-accent-h transition-colors mt-1 break-all"
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>

            {/* Stats card */}
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-2">Components</span>
                  <span className="text-sm font-semibold text-ink">
                    {(components ?? []).length}
                  </span>
                </div>
                <div className="border-t border-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-2">Total copies</span>
                  <span className="text-sm font-semibold text-ink">{totalCopies}</span>
                </div>
                <div className="border-t border-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-2">Member since</span>
                  <span className="text-sm font-semibold text-ink">{memberSince}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-ink-3 uppercase tracking-wide mb-4">
              Public components
            </p>
            {components && components.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {components.map((c) => (
                  <ProfileComponentCard
                    key={c.id}
                    name={c.name}
                    slug={c.slug}
                    category={c.category}
                    imageUrl={c.image_url}
                    copyCount={c.copy_count}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface p-16 text-center">
                <p className="font-medium text-ink mb-1">No public components yet</p>
                <p className="text-sm text-ink-3">
                  This user hasn't shared any components yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
rtk npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke test in browser**

Run `npm run dev`. Navigate to `/u/[any-existing-username]`. Confirm:
- Two columns appear on wide screen, stacked on narrow screen
- Sidebar shows avatar, name, @username, bio, website, stats
- Components appear in a 2-column grid

- [ ] **Step 4: Commit**

```bash
rtk git add app/u/[username]/page.tsx
rtk git commit -m "feat: profile page two-column layout with private gate"
```

---

## Task 3: ProfileComponentCard — Grid Card Format

**Files:**
- Modify: `components/ProfileComponentCard.tsx`

- [ ] **Step 1: Rewrite `components/ProfileComponentCard.tsx`**

Replace the entire file with:

```typescript
import Link from 'next/link';

interface ProfileComponentCardProps {
  name: string;
  slug: string;
  category: string | null;
  imageUrl: string | null;
  copyCount: number;
}

export default function ProfileComponentCard({
  name,
  slug,
  category,
  imageUrl,
  copyCount,
}: ProfileComponentCardProps) {
  return (
    <Link
      href={`/c/${slug}`}
      className="group rounded-xl border border-border bg-white overflow-hidden hover:border-accent/30 hover:shadow-sm transition-all"
    >
      {/* Thumbnail — 80px tall */}
      <div className="h-20 bg-accent-bg overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-accent/40"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-medium text-sm text-ink truncate group-hover:text-accent transition-colors mb-1.5">
          {name}
        </p>
        <div className="flex items-center gap-2">
          {category && (
            <span className="text-xs text-accent bg-accent-bg px-2 py-0.5 rounded-full">
              {category}
            </span>
          )}
          <span className="text-xs text-ink-3 ml-auto">
            {copyCount} {copyCount === 1 ? 'copy' : 'copies'}
          </span>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
rtk npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify in browser**

Navigate to a profile page with components. Each component should appear as a card with an 80px thumbnail area, name, category badge, and copy count.

- [ ] **Step 4: Commit**

```bash
rtk git add components/ProfileComponentCard.tsx
rtk git commit -m "feat: profile component card grid format with thumbnail"
```

---

## Task 4: Avatar Upload — Server Action + Client Component

**Files:**
- Create: `app/actions/updateAvatar.ts`
- Create: `components/AvatarUpload.tsx`

- [ ] **Step 1: Create `app/actions/updateAvatar.ts`**

```typescript
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';

export type UpdateAvatarResult = { error: string } | { ok: true };

export async function updateAvatarUrl(avatarUrl: string | null): Promise<UpdateAvatarResult> {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' };

  // If a URL is provided, verify it belongs to this user's storage folder
  if (avatarUrl !== null) {
    const expectedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${session.user.id}/`;
    if (!avatarUrl.startsWith(expectedPrefix)) {
      return { error: 'Invalid avatar URL' };
    }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      { id: session.user.id, avatar_url: avatarUrl, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );

  if (error) return { error: 'Failed to update avatar' };

  revalidatePath('/settings');
  return { ok: true };
}
```

- [ ] **Step 2: Create `components/AvatarUpload.tsx`**

```typescript
/* eslint-disable @next/next/no-img-element */
'use client';

import { useRef, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { updateAvatarUrl } from '@/app/actions/updateAvatar';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

interface AvatarUploadProps {
  userId: string;
  avatarUrl: string | null;
  displayName: string;
  onAvatarChange: (url: string | null) => void;
}

export default function AvatarUpload({
  userId,
  avatarUrl,
  displayName,
  onAvatarChange,
}: AvatarUploadProps) {
  const supabase = createClientComponentClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const initials = (displayName || 'U').charAt(0).toUpperCase();

  async function handleFile(file: File) {
    setUploadError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Only JPG, PNG, WebP accepted.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError('File too large. Max 2 MB.');
      return;
    }

    setUploading(true);

    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: storageError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (storageError) {
      setUploadError('Upload failed. Please try again.');
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

    const result = await updateAvatarUrl(publicUrl);
    setUploading(false);

    if ('error' in result) {
      setUploadError(result.error);
      return;
    }

    onAvatarChange(publicUrl);
    toast.success('Avatar updated');
  }

  async function handleRemove() {
    setUploadError(null);
    const result = await updateAvatarUrl(null);
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    onAvatarChange(null);
    toast.success('Avatar removed');
  }

  return (
    <div className="flex items-center gap-4">
      {/* Avatar with camera overlay on hover */}
      <div
        className="relative flex-shrink-0 group cursor-pointer"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <div className="w-16 h-16 rounded-full overflow-hidden">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-accent-bg flex items-center justify-center text-accent font-heading font-bold text-xl">
              {initials}
            </div>
          )}
        </div>

        {/* Camera overlay */}
        {!uploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
              />
            </svg>
          </div>
        )}

        {/* Upload spinner */}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
            <svg
              className="animate-spin w-5 h-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info + buttons */}
      <div className="flex-1">
        <p className="text-xs text-ink-3 mb-2">JPG, PNG or WebP · Max 2 MB</p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="text-sm font-medium text-accent border border-accent rounded-lg px-3 py-1.5 hover:bg-accent-bg transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>
          {avatarUrl && !uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-sm text-ink-3 hover:text-ink transition-colors"
            >
              Remove
            </button>
          )}
        </div>
        {uploadError && (
          <p className="text-xs text-red-500 mt-1.5">{uploadError}</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
rtk npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
rtk git add app/actions/updateAvatar.ts components/AvatarUpload.tsx
rtk git commit -m "feat: avatar upload to Supabase Storage with server action"
```

---

## Task 5: Privacy Toggle — Server Action + Client Component

**Files:**
- Create: `app/actions/updatePrivacy.ts`
- Create: `components/PrivacyToggle.tsx`

- [ ] **Step 1: Create `app/actions/updatePrivacy.ts`**

```typescript
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';

export async function updatePrivacy(
  isPrivate: boolean
): Promise<{ error: string } | { ok: true }> {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' };

  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      { id: session.user.id, is_private: isPrivate, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );

  if (error) return { error: 'Failed to update privacy setting' };

  revalidatePath('/settings');
  return { ok: true };
}
```

- [ ] **Step 2: Create `components/PrivacyToggle.tsx`**

```typescript
'use client';

import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { updatePrivacy } from '@/app/actions/updatePrivacy';

interface PrivacyToggleProps {
  initialIsPrivate: boolean;
}

export default function PrivacyToggle({ initialIsPrivate }: PrivacyToggleProps) {
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !isPrivate;
    setIsPrivate(next);
    startTransition(async () => {
      const result = await updatePrivacy(next);
      if ('error' in result) {
        setIsPrivate(!next); // revert optimistic update
        toast.error(result.error);
      } else {
        toast.success(next ? 'Profile set to private' : 'Profile set to public');
      }
    });
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-ink">Private profile</p>
        <p className="text-xs text-ink-3 mt-0.5">
          Hide your profile page from other users. Your public component links still work.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isPrivate}
        disabled={isPending}
        onClick={handleToggle}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 cursor-pointer ${
          isPrivate ? 'bg-accent' : 'bg-border'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
            isPrivate ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
rtk npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
rtk git add app/actions/updatePrivacy.ts components/PrivacyToggle.tsx
rtk git commit -m "feat: privacy toggle with instant server action save"
```

---

## Task 6: Wire AvatarUpload + PrivacyToggle into Settings

**Files:**
- Modify: `components/SettingsForm.tsx`
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Replace `app/settings/page.tsx` with the full updated version**

```typescript
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import config from '@/config';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SettingsForm from '@/components/SettingsForm';
import supabaseAdmin from '@/libs/supabaseAdmin';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect(config.auth.loginUrl);

  const userId = session.user.id;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('display_name, username, bio, website, avatar_url, plan, is_private')
    .eq('id', userId)
    .single();

  const avatarUrl =
    profile?.avatar_url ||
    (session.user.user_metadata?.avatar_url as string | undefined) ||
    null;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 mx-auto w-full px-[var(--px-site)] py-16" style={{ maxWidth: 'var(--max-width)' }}>
        <h1 className="font-heading text-3xl font-bold text-ink mb-8">Settings</h1>
        <SettingsForm
          userId={userId}
          email={session.user.email ?? ''}
          plan={profile?.plan ?? 'free'}
          initialDisplayName={
            profile?.display_name ||
            (session.user.user_metadata?.full_name as string | undefined) ||
            (session.user.user_metadata?.name as string | undefined) ||
            ''
          }
          initialUsername={profile?.username ?? ''}
          initialBio={profile?.bio ?? ''}
          initialWebsite={profile?.website ?? ''}
          avatarUrl={avatarUrl}
          initialIsPrivate={profile?.is_private ?? false}
        />
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `components/SettingsForm.tsx`**

Replace the entire file with:

```typescript
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { updateProfile } from '@/app/actions/updateProfile';
import AvatarUpload from '@/components/AvatarUpload';
import PrivacyToggle from '@/components/PrivacyToggle';

interface SettingsFormProps {
  userId: string;
  email: string;
  plan: string;
  initialDisplayName: string;
  initialUsername: string;
  initialBio: string;
  initialWebsite: string;
  avatarUrl: string | null;
  initialIsPrivate: boolean;
}

export default function SettingsForm({
  userId,
  email,
  plan,
  initialDisplayName,
  initialUsername,
  initialBio,
  initialWebsite,
  avatarUrl,
  initialIsPrivate,
}: SettingsFormProps) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  // Live avatar URL — updated immediately after upload without page reload
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [website, setWebsite] = useState(initialWebsite);
  const usernameChanged = username !== initialUsername && initialUsername !== '';

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateProfile(formData);
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Profile saved!');
        setIsEditing(false);
        router.refresh();
      }
    });
  }

  const initials = (displayName || email).charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Profile section */}
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading font-semibold text-ink">Profile</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm font-medium text-accent hover:text-accent-h transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Avatar upload */}
            <AvatarUpload
              userId={userId}
              avatarUrl={currentAvatarUrl}
              displayName={displayName || email}
              onAvatarChange={setCurrentAvatarUrl}
            />

            {/* Display name */}
            <div>
              <label htmlFor="display_name" className="block text-sm font-medium text-ink mb-1.5">
                Display name
              </label>
              <input
                id="display_name"
                name="display_name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                placeholder="Your name"
                className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
              />
              <p className="text-xs text-ink-3 mt-1">{displayName.length} / 50</p>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ink mb-1.5">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }
                maxLength={30}
                placeholder="your-username"
                className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
              />
              <p className="text-xs text-ink-3 mt-1">
                flowvault.io/u/{username || 'your-username'}
              </p>
              {usernameChanged && (
                <p className="text-xs text-amber-600 mt-1">
                  Changing your username will break existing links to your profile.
                </p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-ink mb-1.5">
                Bio <span className="text-ink-3 font-normal">(optional)</span>
              </label>
              <textarea
                id="bio"
                name="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={3}
                placeholder="Tell the community about yourself…"
                className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors resize-none"
              />
              <p className="text-xs text-ink-3 mt-1">{bio.length} / 160</p>
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-ink mb-1.5">
                Website <span className="text-ink-3 font-normal">(optional)</span>
              </label>
              <input
                id="website"
                name="website"
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setDisplayName(initialDisplayName);
                  setUsername(initialUsername);
                  setBio(initialBio);
                  setWebsite(initialWebsite);
                  setIsEditing(false);
                }}
                className="text-sm font-medium text-ink-2 hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-2 text-sm transition-colors disabled:opacity-50"
              >
                {isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              {/* Avatar preview — uses live currentAvatarUrl */}
              {currentAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentAvatarUrl}
                  alt={displayName || email}
                  className="w-16 h-16 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-accent-bg flex items-center justify-center text-accent font-heading font-bold text-xl">
                  {initials}
                </div>
              )}
              <div>
                <p className="font-medium text-ink">
                  {displayName || <span className="text-ink-3">No display name set</span>}
                </p>
                {username && (
                  <p className="text-sm text-ink-3 mt-0.5">@{username}</p>
                )}
              </div>
            </div>

            {bio && (
              <div>
                <p className="text-xs font-medium text-ink-3 uppercase tracking-wide mb-1">Bio</p>
                <p className="text-sm text-ink-2">{bio}</p>
              </div>
            )}

            {website && (
              <div>
                <p className="text-xs font-medium text-ink-3 uppercase tracking-wide mb-1">Website</p>
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent hover:text-accent-h transition-colors"
                >
                  {website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}

            {!username && (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Set a username to get your public profile at{' '}
                <span className="font-medium">flowvault.io/u/your-username</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Account section */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="font-heading font-semibold text-ink mb-6">Account</h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-2">Email</span>
            <span className="text-sm text-ink font-medium">{email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-2">Plan</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-ink capitalize">{plan}</span>
              {plan === 'free' && (
                <a
                  href="/pricing"
                  className="text-xs text-accent hover:text-accent-h font-medium transition-colors"
                >
                  Upgrade →
                </a>
              )}
            </div>
          </div>

          {/* Privacy toggle */}
          <div className="pt-2 border-t border-border">
            <PrivacyToggle initialIsPrivate={initialIsPrivate} />
          </div>

          <div className="pt-2 border-t border-border flex justify-end">
            <button
              onClick={handleSignOut}
              className="text-sm font-medium text-ink-2 hover:text-red-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
rtk npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Full smoke test**

Run `npm run dev`. Test the following:

1. **Avatar upload:** Go to `/settings` → click Edit → hover avatar → click camera → pick a JPG under 2 MB → confirm spinner appears → confirm new avatar shows → confirm toast "Avatar updated"
2. **Avatar remove:** Click "Remove" → confirm avatar reverts to initials → toast "Avatar removed"
3. **Avatar errors:** Try a `.gif` file → confirm "Only JPG, PNG, WebP accepted." Try a file > 2 MB → confirm "File too large. Max 2 MB."
4. **Privacy toggle:** Toggle "Private profile" on → toast "Profile set to private" → navigate to `/u/[your-username]` → confirm lock screen. Toggle off → profile page back to normal.
5. **Profile page layout:** Confirm two-column on wide screen, stacked on mobile (resize browser).

- [ ] **Step 5: Commit**

```bash
rtk git add components/SettingsForm.tsx app/settings/page.tsx
rtk git commit -m "feat: wire AvatarUpload and PrivacyToggle into Settings"
```
