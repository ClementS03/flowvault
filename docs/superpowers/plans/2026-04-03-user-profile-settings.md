# User Profile & Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/settings` page for authenticated users to edit their profile, and a public `/u/[username]` page showing their public components.

**Architecture:** Settings page = server component (fetch profile) + `SettingsForm` client component (form state + Server Action). Public profile = pure server component with parallel fetch. A single `updateProfile` Server Action handles all profile field validation and persistence.

**Tech Stack:** Next.js 14 App Router, Supabase Auth Helpers, `supabaseAdmin` (service role), `react-hot-toast`, Tailwind CSS custom tokens.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| Supabase SQL | Run manually | Add 5 columns to `profiles` table |
| `app/actions/updateProfile.ts` | Create | Validate + save profile, check username uniqueness |
| `components/SettingsForm.tsx` | Create | Client form — all fields + save + sign out |
| `app/settings/layout.tsx` | Create | Auth guard (redirect to /signin if no session) |
| `app/settings/page.tsx` | Create | Fetch profile, render SettingsForm |
| `components/ProfileComponentCard.tsx` | Create | Read-only card for public profile |
| `app/u/[username]/page.tsx` | Create | Public profile — parallel fetch profile + components |

---

## Task 1: DB Migration

**Files:** None (manual SQL in Supabase dashboard)

- [ ] **Step 1: Run migration in Supabase SQL editor**

Go to Supabase dashboard → SQL Editor → New query → paste and run:

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
```

- [ ] **Step 2: Verify columns exist**

In Supabase → Table Editor → profiles → confirm the 5 new columns are visible.

- [ ] **Step 3: Commit a migration record**

```bash
rtk git commit --allow-empty -m "chore: profiles table — add display_name, username, bio, website, avatar_url columns (applied in Supabase)"
```

---

## Task 2: `updateProfile` Server Action

**Files:**
- Create: `app/actions/updateProfile.ts`

- [ ] **Step 1: Create the Server Action**

```typescript
// app/actions/updateProfile.ts
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';

export type UpdateProfileResult = { error: string } | { ok: true; username: string };

export async function updateProfile(formData: FormData): Promise<UpdateProfileResult> {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' };

  const userId = session.user.id;

  // Parse fields
  const displayName = (formData.get('display_name') as string)?.trim() || null;
  const usernameRaw = (formData.get('username') as string)?.trim().toLowerCase() || null;
  const bio = (formData.get('bio') as string)?.trim() || null;
  const website = (formData.get('website') as string)?.trim() || null;

  // Validate display name
  if (displayName && displayName.length > 50) {
    return { error: 'Display name must be 50 characters or less' };
  }

  // Validate username
  if (usernameRaw) {
    if (usernameRaw.length < 3) return { error: 'Username must be at least 3 characters' };
    if (usernameRaw.length > 30) return { error: 'Username must be 30 characters or less' };
    if (!/^[a-z0-9-]+$/.test(usernameRaw)) {
      return { error: 'Username can only contain lowercase letters, numbers, and hyphens' };
    }

    // Check uniqueness (exclude current user)
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', usernameRaw)
      .neq('id', userId)
      .single();

    if (existing) return { error: 'Username is already taken' };
  }

  // Validate bio
  if (bio && bio.length > 160) {
    return { error: 'Bio must be 160 characters or less' };
  }

  // Validate website
  if (website) {
    try {
      const url = new URL(website.startsWith('http') ? website : `https://${website}`);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { error: 'Website must be a valid URL' };
      }
    } catch {
      return { error: 'Website must be a valid URL' };
    }
  }

  // Save
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      display_name: displayName,
      username: usernameRaw,
      bio,
      website: website
        ? website.startsWith('http') ? website : `https://${website}`
        : null,
    })
    .eq('id', userId);

  if (updateError) return { error: 'Failed to save profile' };

  revalidatePath('/settings');
  if (usernameRaw) revalidatePath(`/u/${usernameRaw}`);

  return { ok: true, username: usernameRaw ?? '' };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
rtk npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
rtk git add app/actions/updateProfile.ts && rtk git commit -m "feat: add updateProfile server action"
```

---

## Task 3: `SettingsForm` Client Component

**Files:**
- Create: `components/SettingsForm.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/SettingsForm.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { updateProfile } from '@/app/actions/updateProfile';

interface SettingsFormProps {
  userId: string;
  email: string;
  plan: string;
  initialDisplayName: string;
  initialUsername: string;
  initialBio: string;
  initialWebsite: string;
  avatarUrl: string | null;
}

export default function SettingsForm({
  email,
  plan,
  initialDisplayName,
  initialUsername,
  initialBio,
  initialWebsite,
  avatarUrl,
}: SettingsFormProps) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isPending, startTransition] = useTransition();

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
        router.refresh();
      }
    });
  }

  const initials = (displayName || email).charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Profile section */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="font-heading font-semibold text-ink mb-6">Profile</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Avatar (read-only for now) */}
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName || email}
                className="w-16 h-16 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-accent-bg flex items-center justify-center text-accent font-heading font-bold text-xl">
                {initials}
              </div>
            )}
            <p className="text-xs text-ink-3">Avatar is set from your Google account.</p>
          </div>

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
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
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

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
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
                <a href="/pricing" className="text-xs text-accent hover:text-accent-h font-medium transition-colors">
                  Upgrade →
                </a>
              )}
            </div>
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
rtk npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
rtk git add components/SettingsForm.tsx && rtk git commit -m "feat: add SettingsForm client component"
```

---

## Task 4: Settings Page + Layout

**Files:**
- Create: `app/settings/layout.tsx`
- Create: `app/settings/page.tsx`

- [ ] **Step 1: Create the auth-guard layout**

```typescript
// app/settings/layout.tsx
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import config from '@/config';

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect(config.auth.loginUrl);
  return <>{children}</>;
}
```

- [ ] **Step 2: Create the settings page**

```typescript
// app/settings/page.tsx
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SettingsForm from '@/components/SettingsForm';
import supabaseAdmin from '@/libs/supabaseAdmin';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/signin');

  const userId = session.user.id;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('display_name, username, bio, website, avatar_url, plan')
    .eq('id', userId)
    .single();

  // Avatar fallback: profiles.avatar_url → Google OAuth avatar → null
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
          initialDisplayName={profile?.display_name ?? ''}
          initialUsername={profile?.username ?? ''}
          initialBio={profile?.bio ?? ''}
          initialWebsite={profile?.website ?? ''}
          avatarUrl={avatarUrl}
        />
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
rtk npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Test locally**

```bash
rtk npm run dev
```

- Sign in → navigate to `http://localhost:3001/settings`
- [ ] Page loads with empty fields (first visit) or existing values
- [ ] Saving with valid fields → toast "Profile saved!"
- [ ] Saving with duplicate username → toast error "Username is already taken"
- [ ] Sign out button → redirects to `/`
- [ ] Footer is at the bottom of the page

- [ ] **Step 5: Commit**

```bash
rtk git add app/settings/layout.tsx app/settings/page.tsx && rtk git commit -m "feat: add settings page with profile form"
```

---

## Task 5: `ProfileComponentCard` Component

**Files:**
- Create: `components/ProfileComponentCard.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/ProfileComponentCard.tsx
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
      className="flex items-center gap-4 p-4 border-b border-border last:border-0 hover:bg-surface transition-colors group"
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg bg-surface border border-border flex-shrink-0 overflow-hidden group-hover:border-accent/30 transition-colors">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-ink-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-ink text-sm truncate group-hover:text-accent transition-colors">{name}</span>
          {category && (
            <span className="text-xs text-accent bg-accent-bg px-2 py-0.5 rounded-full">{category}</span>
          )}
        </div>
        <p className="text-xs text-ink-3 mt-0.5">
          {copyCount} {copyCount === 1 ? 'copy' : 'copies'}
        </p>
      </div>

      {/* Arrow */}
      <span className="text-ink-3 group-hover:text-accent transition-colors text-sm flex-shrink-0">→</span>
    </Link>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
rtk npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
rtk git add components/ProfileComponentCard.tsx && rtk git commit -m "feat: add ProfileComponentCard for public profile"
```

---

## Task 6: Public Profile Page

**Files:**
- Create: `app/u/[username]/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// app/u/[username]/page.tsx
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

  // Parallel fetch: profile + public components
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, username, bio, website, avatar_url, plan')
    .eq('username', username)
    .single();

  if (!profile) notFound();

  const { data: components } = await supabaseAdmin
    .from('components')
    .select('id, name, slug, category, image_url, copy_count, created_at')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .eq('is_temporary', false)
    .order('created_at', { ascending: false });

  const totalCopies = (components ?? []).reduce((sum, c) => sum + (c.copy_count ?? 0), 0);
  const displayName = profile.display_name || profile.username || 'Anonymous';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 mx-auto w-full px-[var(--px-site)] py-16" style={{ maxWidth: 'var(--max-width)' }}>
        {/* Profile header */}
        <div className="flex items-start gap-6 mb-12">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-20 h-20 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-accent-bg flex items-center justify-center text-accent font-heading font-bold text-2xl">
                {initials}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-2xl font-bold text-ink mb-0.5">{displayName}</h1>
            <p className="text-sm text-ink-3 mb-3">@{profile.username}</p>

            {profile.bio && (
              <p className="text-sm text-ink-2 mb-3 max-w-lg">{profile.bio}</p>
            )}

            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:text-accent-h transition-colors"
              >
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}

            <p className="text-sm text-ink-3 mt-3">
              <span className="font-medium text-ink">{(components ?? []).length}</span> components
              {' · '}
              <span className="font-medium text-ink">{totalCopies}</span> total copies
            </p>
          </div>
        </div>

        {/* Components list */}
        {components && components.length > 0 ? (
          <div className="rounded-xl border border-border bg-white overflow-hidden">
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
            <p className="text-sm text-ink-3">This user hasn't shared any components yet.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
rtk npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Test locally**

- [ ] Set a username in `/settings` (e.g., `testuser`)
- [ ] Navigate to `http://localhost:3001/u/testuser` → profile shows
- [ ] Navigate to `http://localhost:3001/u/doesnotexist` → 404 page
- [ ] Components with `is_public = true` appear; private ones do not

- [ ] **Step 4: Commit**

```bash
rtk git add app/u && rtk git commit -m "feat: add public user profile page /u/[username]"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|---|---|
| DB: 5 new columns on profiles | Task 1 ✓ |
| display_name (max 50) | Tasks 2, 3 ✓ |
| username (lowercase, alphanumeric+hyphens, unique, min 3, max 30) | Task 2 ✓ |
| bio (max 160, optional) | Tasks 2, 3 ✓ |
| website (valid URL, optional) | Tasks 2, 3 ✓ |
| Email readonly | Task 3 — Account section ✓ |
| Plan readonly + Upgrade link | Task 3 — Account section ✓ |
| Avatar: profiles.avatar_url → Google fallback | Tasks 3, 4 ✓ |
| Sign out button | Task 3 ✓ |
| Username change warning | Task 3 — amber warning text ✓ |
| Settings auth guard | Task 4 — layout.tsx ✓ |
| Footer at bottom | Tasks 4, 6 — flex min-h-screen ✓ |
| Public profile: fetch by username, notFound() | Task 6 ✓ |
| Public profile: avatar + display name + @username + bio + website | Task 6 ✓ |
| Public profile: stats (component count + total copies) | Task 6 ✓ |
| Public profile: list of public components, is_temporary=false | Task 6 ✓ |
| ProfileComponentCard: thumbnail, name, category, copy_count, link to /c/[slug] | Task 5 ✓ |
| No inline actions on public profile | Task 5 — Link only, no buttons ✓ |

No gaps found. No placeholders.
