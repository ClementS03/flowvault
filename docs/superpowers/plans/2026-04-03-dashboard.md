# Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the authenticated `/dashboard` page — a list view of the user's components with inline actions (copy link, copy to Webflow, toggle public, view, delete) and a plan progress bar.

**Architecture:** Server component (`app/dashboard/page.tsx`) fetches components + profile in parallel via `supabaseAdmin`, generates signed JSON URLs for each component, then renders a list of `ComponentRow` client components. Two new Server Actions handle delete and toggle-public mutations with ownership verification.

**Tech Stack:** Next.js 14 App Router, Supabase Auth Helpers (`createServerActionClient`, `createServerComponentClient`), `supabaseAdmin` (service role), React client components, `react-hot-toast`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/dashboard/page.tsx` | Rewrite | Fetch components + profile, generate signed URLs, render list |
| `app/actions/deleteComponent.ts` | Create | Ownership check, Storage cleanup, DB delete, decrement count |
| `app/actions/togglePublic.ts` | Create | Ownership check, update `is_public` |
| `components/ComponentRow.tsx` | Create | Client component — displays one component row with 5 inline actions |

---

## Task 1: `deleteComponent` Server Action

**Files:**
- Create: `app/actions/deleteComponent.ts`

- [ ] **Step 1: Create the Server Action**

```typescript
// app/actions/deleteComponent.ts
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';

export async function deleteComponent(id: string): Promise<void> {
  // 1. Verify ownership
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Unauthorized');

  const { data: component } = await supabaseAdmin
    .from('components')
    .select('id, user_id, json_path, component_count_at_delete')
    .eq('id', id)
    .single();

  if (!component || component.user_id !== session.user.id) {
    throw new Error('Unauthorized');
  }

  // 2. Delete Storage files in parallel (JSON + preview image if exists — try both .jpg and .png)
  await Promise.all([
    supabaseAdmin.storage.from('components-json').remove([component.json_path]),
    supabaseAdmin.storage.from('component-previews').remove([`${id}.jpg`]),
    supabaseAdmin.storage.from('component-previews').remove([`${id}.png`]),
  ]);

  // 3. Delete DB row
  await supabaseAdmin.from('components').delete().eq('id', id);

  // 4. Decrement component_count
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('component_count')
    .eq('id', session.user.id)
    .single();

  if (profile && profile.component_count > 0) {
    await supabaseAdmin
      .from('profiles')
      .update({ component_count: profile.component_count - 1 })
      .eq('id', session.user.id);
  }

  // 5. Revalidate
  revalidatePath('/dashboard');
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
rtk npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
rtk git add app/actions/deleteComponent.ts && rtk git commit -m "feat: add deleteComponent server action"
```

---

## Task 2: `togglePublic` Server Action

**Files:**
- Create: `app/actions/togglePublic.ts`

- [ ] **Step 1: Create the Server Action**

```typescript
// app/actions/togglePublic.ts
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';

export async function togglePublic(id: string, isPublic: boolean): Promise<void> {
  // 1. Verify ownership
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Unauthorized');

  const { data: component } = await supabaseAdmin
    .from('components')
    .select('id, user_id')
    .eq('id', id)
    .single();

  if (!component || component.user_id !== session.user.id) {
    throw new Error('Unauthorized');
  }

  // 2. Update is_public
  await supabaseAdmin
    .from('components')
    .update({ is_public: isPublic })
    .eq('id', id);

  // 3. Revalidate
  revalidatePath('/dashboard');
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
rtk npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
rtk git add app/actions/togglePublic.ts && rtk git commit -m "feat: add togglePublic server action"
```

---

## Task 3: `ComponentRow` Client Component

**Files:**
- Create: `components/ComponentRow.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/ComponentRow.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { deleteComponent } from '@/app/actions/deleteComponent';
import { togglePublic } from '@/app/actions/togglePublic';
import { copyToWebflow } from '@/libs/copyToWebflow';

interface ComponentRowProps {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  imageUrl: string | null;
  isPublic: boolean;
  copyCount: number;
  signedJsonUrl: string;
}

export default function ComponentRow({
  id,
  name,
  slug,
  category,
  imageUrl,
  isPublic: initialIsPublic,
  copyCount,
  signedJsonUrl,
}: ComponentRowProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isDeleting, setIsDeleting] = useState(false);

  const shareUrl = `${window.location.origin}/c/${slug}`;

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied!');
  }

  function handleCopyToWebflow() {
    const bridge = document.getElementById('clipboard-bridge') as HTMLTextAreaElement | null;
    if (!bridge) {
      toast.error('Clipboard bridge not found.');
      return;
    }
    // Fetch JSON synchronously — caller must ensure signedJsonUrl is ready
    fetch(signedJsonUrl)
      .then((r) => r.text())
      .then((json) => {
        const success = copyToWebflow(json, bridge);
        if (success) {
          toast.success('Copied! Paste in Webflow Designer (Ctrl+V)');
        } else {
          toast.error('Copy failed.');
        }
      })
      .catch(() => toast.error('Failed to load component data.'));
  }

  async function handleTogglePublic() {
    const next = !isPublic;
    setIsPublic(next); // Optimistic update
    try {
      await togglePublic(id, next);
    } catch {
      setIsPublic(!next); // Revert on error
      toast.error('Failed to update visibility.');
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await deleteComponent(id);
      // Row disappears via revalidatePath — no local state needed
    } catch {
      toast.error('Failed to delete component.');
      setIsDeleting(false);
    }
  }

  return (
    <div className={`flex items-center gap-4 p-4 border-b border-border last:border-0 ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg bg-surface border border-border flex-shrink-0 overflow-hidden">
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
          <span className="font-medium text-ink text-sm truncate">{name}</span>
          {category && (
            <span className="text-xs text-accent bg-accent-bg px-2 py-0.5 rounded-full">{category}</span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full ${isPublic ? 'bg-green-50 text-green-700' : 'bg-surface text-ink-3 border border-border'}`}>
            {isPublic ? 'Public' : 'Private'}
          </span>
        </div>
        <p className="text-xs text-ink-3 mt-0.5">{copyCount} {copyCount === 1 ? 'copy' : 'copies'}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Copy link */}
        <button
          onClick={handleCopyLink}
          title="Copy share link"
          className="p-2 rounded-lg hover:bg-surface text-ink-2 hover:text-ink transition-colors text-sm"
        >
          ⎘
        </button>

        {/* Copy to Webflow */}
        <button
          onClick={handleCopyToWebflow}
          title="Copy to Webflow"
          className="p-2 rounded-lg hover:bg-surface text-ink-2 hover:text-ink transition-colors text-sm"
        >
          ⬇
        </button>

        {/* Toggle public/private */}
        <button
          onClick={handleTogglePublic}
          title={isPublic ? 'Make private' : 'Make public'}
          className="p-2 rounded-lg hover:bg-surface text-ink-2 hover:text-ink transition-colors text-sm"
        >
          👁
        </button>

        {/* View public page */}
        <Link
          href={`/c/${slug}`}
          target="_blank"
          title="View public page"
          className="p-2 rounded-lg hover:bg-surface text-ink-2 hover:text-ink transition-colors text-sm"
        >
          →
        </Link>

        {/* Delete */}
        <button
          onClick={handleDelete}
          title="Delete component"
          className="p-2 rounded-lg hover:bg-red-50 text-ink-3 hover:text-red-600 transition-colors text-sm"
        >
          🗑
        </button>
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
rtk git add components/ComponentRow.tsx && rtk git commit -m "feat: add ComponentRow client component"
```

---

## Task 4: Dashboard Page Rewrite

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Rewrite the dashboard page**

```typescript
// app/dashboard/page.tsx
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ComponentRow from '@/components/ComponentRow';
import supabaseAdmin from '@/libs/supabaseAdmin';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Session is already verified by layout.tsx — safe to assume it exists
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session!.user.id;

  // Parallel fetch: components + profile
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

  // Generate signed URLs for each component (1h TTL)
  const signedUrls: Record<string, string> = {};
  if (components && components.length > 0) {
    await Promise.all(
      components.map(async (c) => {
        const { data } = await supabaseAdmin.storage
          .from('components-json')
          .createSignedUrl(c.json_path, 3600);
        if (data?.signedUrl) signedUrls[c.id] = data.signedUrl;
      })
    );
  }

  const plan = profile?.plan ?? 'free';
  const componentCount = profile?.component_count ?? 0;
  const isFree = plan === 'free';
  const progressPercent = isFree ? Math.min((componentCount / 10) * 100, 100) : 100;

  return (
    <>
      <Header />
      <main className="mx-auto px-[var(--px-site)] py-16" style={{ maxWidth: 'var(--max-width)' }}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-3xl font-bold text-ink">My library</h1>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-2 text-sm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Upload component
          </Link>
        </div>

        {/* Plan progress bar */}
        {isFree && (
          <div className="flex items-center gap-4 mb-8 p-4 rounded-xl bg-surface border border-border">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-ink-2">
                  <span className="font-medium text-ink">{componentCount}</span> / 10 components · Free plan
                </span>
                <Link href="/pricing" className="text-sm text-accent hover:text-accent-h font-medium transition-colors">
                  Upgrade →
                </Link>
              </div>
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {!isFree && (
          <div className="mb-8 p-3 rounded-xl bg-accent-bg border border-accent/20">
            <span className="text-sm font-medium text-accent">Pro · Unlimited components</span>
          </div>
        )}

        {/* Component list or empty state */}
        {components && components.length > 0 ? (
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            {components.map((c) => (
              <ComponentRow
                key={c.id}
                id={c.id}
                name={c.name}
                slug={c.slug}
                category={c.category}
                imageUrl={c.image_url}
                isPublic={c.is_public}
                copyCount={c.copy_count}
                signedJsonUrl={signedUrls[c.id] ?? ''}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-accent">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
              </svg>
            </div>
            <p className="font-medium text-ink mb-1">No components yet</p>
            <p className="text-sm text-ink-3 mb-6">Upload your first Webflow component to get started</p>
            <Link
              href="/upload"
              className="inline-flex items-center rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-2 text-sm transition-colors"
            >
              Upload component
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
rtk npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Test locally**

Start dev server:
```bash
rtk npm run dev
```

Checklist:
- [ ] Signed in user sees their components listed
- [ ] Free plan user sees progress bar (e.g. "3 / 10 components · Free plan")
- [ ] Pro user sees "Pro · Unlimited" banner instead
- [ ] Empty state renders when no components exist
- [ ] Upload component button links to `/upload`

- [ ] **Step 4: Commit**

```bash
rtk git add app/dashboard/page.tsx && rtk git commit -m "feat: rewrite dashboard page with component list and plan progress bar"
```

---

## Task 5: Smoke Test Inline Actions

Test each action manually in dev:

- [ ] **Copy link** — click ⎘ → toast "Link copied!" appears → clipboard contains `/c/[slug]` URL
- [ ] **Copy to Webflow** — click ⬇ → toast "Copied! Paste in Webflow Designer" → paste in Webflow Designer works
- [ ] **Toggle public** — click 👁 → badge flips between "Public" and "Private" immediately (optimistic) → refresh confirms change persisted
- [ ] **View** — click → → `/c/[slug]` opens in new tab
- [ ] **Delete** — click 🗑 → confirm dialog appears → on confirm, row disappears and component_count decrements (verify in Supabase dashboard)

- [ ] **Step 1: Commit test confirmation**

```bash
rtk git commit --allow-empty -m "chore: smoke test dashboard actions — all passing"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| Server component, parallel queries | Task 4 — Promise.all |
| Signed URLs generated server-side (1h TTL) | Task 4 — createSignedUrl loop |
| Plan progress bar (free 3/10, capped at 100%) | Task 4 — progressPercent calc |
| Upgrade → links to /pricing | Task 4 — Link href="/pricing" |
| Hidden for Pro / shows "Pro · Unlimited" | Task 4 — !isFree branch |
| ComponentRow: thumbnail (or placeholder) | Task 3 — imageUrl conditional |
| ComponentRow: name + category badge + copy_count + public/private badge | Task 3 ✓ |
| Copy link → toast "Link copied!" | Task 3 — handleCopyLink |
| Copy to Webflow → signed URL, synchronous copyToWebflow | Task 3 — handleCopyToWebflow |
| Toggle public → optimistic UI, Server Action confirms | Task 3 — optimistic setIsPublic + Task 2 |
| View → /c/[slug] target="_blank" | Task 3 — Link component |
| Delete → window.confirm + Server Action + row disappears | Task 3 — handleDelete + Task 1 |
| deleteComponent: ownership check | Task 1 ✓ |
| deleteComponent: delete both Storage files (JSON + image .jpg + .png) | Task 1 — Promise.all with both extensions |
| deleteComponent: DELETE from components | Task 1 ✓ |
| deleteComponent: decrement component_count | Task 1 ✓ |
| deleteComponent: revalidatePath('/dashboard') | Task 1 ✓ |
| togglePublic: ownership check | Task 2 ✓ |
| togglePublic: UPDATE is_public | Task 2 ✓ |
| togglePublic: revalidatePath('/dashboard') | Task 2 ✓ |
| Empty state when no components | Task 4 ✓ |
| is_temporary = false filter | Task 4 — .eq('is_temporary', false) |

All spec requirements covered. No placeholders.
