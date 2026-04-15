# Page Templates & Kits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Page Templates (typed components) and Kits (curated component collections) to FlowVault, with browse tabs and a full kit creation/edit flow.

**Architecture:** Extend `components` with a `type` column (`component` | `page_template`); add `kits` + `kit_components` tables. Browse gains three tabs. Upload form gets a type toggle. New routes handle kit CRUD.

**Tech Stack:** Next.js 14 App Router, Supabase (supabaseAdmin + RLS), TypeScript, Tailwind CSS, `@supabase/auth-helpers-nextjs`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `docs/migrations/2026-04-15-page-templates-kits.sql` | Create | SQL to run in Supabase Dashboard |
| `components/UploadSlideOver.tsx` | Modify | Add type toggle + dynamic category list |
| `app/actions/createComponent.ts` | Modify | Accept `type` field from formData |
| `app/browse/page.tsx` | Modify | Add `tab` searchParam, query kits on Kits tab |
| `app/browse/BrowseFilters.tsx` | Modify | Tab pills + per-tab category list |
| `app/actions/createKit.ts` | Create | Server Action: validate + INSERT kit + pivot |
| `app/actions/updateKit.ts` | Create | Server Action: UPDATE kit + pivot |
| `app/actions/deleteKit.ts` | Create | Server Action: DELETE kit |
| `app/kit/[slug]/page.tsx` | Create | Server Component: kit detail page |
| `app/kit/new/page.tsx` | Create | Client Component: kit creation form |
| `app/kit/[slug]/edit/page.tsx` | Create | Client Component: kit edit form |
| `app/dashboard/page.tsx` | Modify | Add Kits tab with kit list |
| `app/api/components/[id]/copy/route.ts` | Modify | Accept `?kit_id` → increment kit copy_count |

---

## Task 1 — SQL Migration File

**Files:**
- Create: `docs/migrations/2026-04-15-page-templates-kits.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Migration: 2026-04-15-page-templates-kits
-- Run this in the Supabase Dashboard → SQL Editor

-- 1. Add type column to components
ALTER TABLE public.components
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'component';
-- Allowed values: 'component' | 'page_template'

-- 2. Create kits table
CREATE TABLE IF NOT EXISTS public.kits (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  description text,
  slug        text UNIQUE NOT NULL,
  is_public   boolean DEFAULT false,
  copy_count  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read kits"
  ON public.kits FOR SELECT USING (is_public = true);
CREATE POLICY "Own read kits"
  ON public.kits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own insert kits"
  ON public.kits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own update kits"
  ON public.kits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own delete kits"
  ON public.kits FOR DELETE USING (auth.uid() = user_id);

-- 3. Create kit_components pivot table
CREATE TABLE IF NOT EXISTS public.kit_components (
  kit_id       uuid REFERENCES public.kits ON DELETE CASCADE NOT NULL,
  component_id uuid REFERENCES public.components ON DELETE CASCADE NOT NULL,
  position     integer NOT NULL DEFAULT 0,
  PRIMARY KEY (kit_id, component_id)
);

ALTER TABLE public.kit_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read kit_components"
  ON public.kit_components FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.is_public = true
  ));
CREATE POLICY "Own read kit_components"
  ON public.kit_components FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.user_id = auth.uid()
  ));
CREATE POLICY "Own insert kit_components"
  ON public.kit_components FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.user_id = auth.uid()
  ));
CREATE POLICY "Own delete kit_components"
  ON public.kit_components FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.kits k WHERE k.id = kit_id AND k.user_id = auth.uid()
  ));
```

- [ ] **Step 2: Run in Supabase Dashboard**

Go to Supabase Dashboard → SQL Editor → paste the file content → Run.
Verify: `components` table has `type` column, `kits` and `kit_components` tables exist.

- [ ] **Step 3: Commit**

```bash
rtk git add docs/migrations/2026-04-15-page-templates-kits.sql
rtk git commit -m "docs: add SQL migration for page templates and kits"
```

---

## Task 2 — Upload: type toggle + dynamic categories

**Files:**
- Modify: `components/UploadSlideOver.tsx`

- [ ] **Step 1: Add `itemType` state and category constants**

After the existing state declarations (around line 38, after `showUpgradeModal`), add:

```typescript
const [itemType, setItemType] = useState<'component' | 'page_template'>('component');

const COMPONENT_CATEGORIES = [
  { value: 'hero', label: 'Hero' },
  { value: 'navbar', label: 'Navbar' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'footer', label: 'Footer' },
  { value: 'feature', label: 'Feature' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

const PAGE_CATEGORIES = [
  { value: 'landing', label: 'Landing' },
  { value: 'pricing-page', label: 'Pricing page' },
  { value: 'blog', label: 'Blog' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'saas', label: 'SaaS' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'other', label: 'Other' },
];
```

Remove the existing top-level `CATEGORIES` constant (lines 11–19) — it's now replaced by the two above.

- [ ] **Step 2: Add type toggle + pass type in formData**

Inside `handleSubmit`, after `formData.set('is_public', String(isPublic))`, add:

```typescript
formData.set('type', itemType);
```

Update the category validation message:

```typescript
if (isPublic && !category) {
  toast.error(`A category is required to make a ${itemType === 'page_template' ? 'page template' : 'component'} public`);
  setIsSubmitting(false);
  return;
}
```

- [ ] **Step 3: Add the type toggle UI and dynamic category list in the form**

In the `step === 'form'` section, immediately after the `<form>` opening tag (before the name field), add:

```tsx
{/* Type toggle */}
<div>
  <label className="block text-sm font-medium text-ink mb-2">Type</label>
  <div className="flex gap-2">
    {(['component', 'page_template'] as const).map((t) => (
      <button
        key={t}
        type="button"
        onClick={() => setItemType(t)}
        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          itemType === t
            ? 'border-accent bg-accent-bg text-accent'
            : 'border-border bg-surface text-ink-2 hover:border-accent/40'
        }`}
      >
        {t === 'component' ? 'Component' : 'Page Template'}
      </button>
    ))}
  </div>
  {itemType === 'page_template' && (
    <p className="mt-1.5 text-xs text-ink-3">
      Select all content on a Webflow page (Ctrl+A) before copying.
    </p>
  )}
</div>
```

Replace the existing `CATEGORIES.map(...)` inside the category `<select>` with:

```tsx
{(itemType === 'page_template' ? PAGE_CATEGORIES : COMPONENT_CATEGORIES).map((c) => (
  <option key={c.value} value={c.value}>{c.label}</option>
))}
```

Update the slide-over header title to be dynamic:

```tsx
{step === 'set-username' ? 'Choose your username' : itemType === 'page_template' ? 'Configure your page template' : 'Configure your component'}
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
rtk git add components/UploadSlideOver.tsx
rtk git commit -m "feat: add type toggle (component / page template) to upload form"
```

---

## Task 3 — createComponent action: accept type

**Files:**
- Modify: `app/actions/createComponent.ts`

- [ ] **Step 1: Extract `type` from formData and include in INSERT**

After the `isPublic` line (around line 33), add:

```typescript
const type = (formData.get('type') as string) === 'page_template' ? 'page_template' : 'component';
```

In the `supabaseAdmin.from('components').insert({...})` call (around line 138), add `type` to the insert object:

```typescript
{
  id: componentId,
  user_id: userId,
  name,
  description,
  category,
  tags,
  slug,
  json_path: jsonPath,
  image_url: imageUrl,
  is_public: isPublic,
  password_hash: passwordHash,
  is_temporary: isTemporary,
  expires_at: expiresAt,
  copy_count: 0,
  type,   // ← add this line
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
rtk git add app/actions/createComponent.ts
rtk git commit -m "feat: store type (component|page_template) on upload"
```

---

## Task 4 — Browse: tabs + per-tab filtering

**Files:**
- Modify: `app/browse/page.tsx`
- Modify: `app/browse/BrowseFilters.tsx`

- [ ] **Step 1: Update BrowseFilters to add tab pills and per-tab categories**

Replace the entire content of `app/browse/BrowseFilters.tsx` with:

```tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const TABS = [
  { value: 'components', label: 'Components' },
  { value: 'pages', label: 'Pages' },
  { value: 'kits', label: 'Kits' },
];

const COMPONENT_CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'hero', label: 'Hero' },
  { value: 'navbar', label: 'Navbar' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'footer', label: 'Footer' },
  { value: 'feature', label: 'Feature' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

const PAGE_CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'landing', label: 'Landing' },
  { value: 'pricing-page', label: 'Pricing page' },
  { value: 'blog', label: 'Blog' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'saas', label: 'SaaS' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'other', label: 'Other' },
];

export default function BrowseFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'components';
  const activeCategory = searchParams.get('category') ?? '';
  const activeTag = searchParams.get('tag') ?? '';

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/browse?${params.toString()}`);
    },
    [router, searchParams]
  );

  const switchTab = useCallback(
    (tab: string) => {
      // Reset category when switching tabs
      router.push(`/browse?tab=${tab}`);
    },
    [router]
  );

  const categories = activeTab === 'pages' ? PAGE_CATEGORIES : COMPONENT_CATEGORIES;
  const showCategoryFilter = activeTab !== 'kits';

  return (
    <div className="flex flex-col gap-4 mb-8">
      {/* Tab pills */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => switchTab(t.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === t.value
                ? 'bg-ink text-white'
                : 'bg-surface border border-border text-ink-2 hover:border-accent/40 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Category + tag filters — hidden on Kits tab */}
      {showCategoryFilter && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.value}
                onClick={() => updateParam('category', c.value)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === c.value
                    ? 'bg-accent text-white'
                    : 'bg-surface border border-border text-ink-2 hover:border-accent/40 hover:text-ink'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="relative sm:ml-auto w-full sm:w-56 shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            <input
              type="text"
              placeholder="Filter by tag…"
              defaultValue={activeTag}
              className="w-full rounded-full border border-border bg-surface pl-9 pr-4 py-1.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateParam('tag', (e.target as HTMLInputElement).value.trim());
                }
              }}
              onBlur={(e) => updateParam('tag', e.target.value.trim())}
            />
            {activeTag && (
              <button
                onClick={() => updateParam('tag', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                aria-label="Clear tag filter"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update browse/page.tsx to handle tab + kit queries**

Replace the `Props` interface and the start of the page function:

```typescript
interface Props {
  searchParams: { tab?: string; category?: string; tag?: string };
}

export default async function BrowsePage({ searchParams }: Props) {
  const tab = searchParams.tab ?? 'components';
  const category = searchParams.category?.trim() || null;
  const tag = searchParams.tag?.trim() || null;
```

Below the existing `profileMap` declaration, add a kits list type:

```typescript
let kitList: {
  id: string; slug: string; name: string; description: string | null;
  copy_count: number; created_at: string; user_id: string;
  kit_components: { component_id: string }[];
}[] = [];
```

Replace the existing `try` block's query logic with:

```typescript
try {
  if (tab === 'kits') {
    // Fetch public kits with component count
    const { data: kits, error: kitsError } = await supabaseAdmin
      .from('kits')
      .select('id, slug, name, description, copy_count, created_at, user_id, kit_components(component_id)')
      .eq('is_public', true)
      .order('copy_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60);
    if (kitsError) console.error('[browse] kits query error:', kitsError.message);
    kitList = kits ?? [];

    const userIds = Array.from(new Set(kitList.map((k) => k.user_id).filter(Boolean)));
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);
      if (profilesError) console.error('[browse] profiles query error:', profilesError.message);
      for (const p of profiles ?? []) {
        profileMap[p.id] = p;
      }
    }
  } else {
    // Fetch components filtered by type
    const typeFilter = tab === 'pages' ? 'page_template' : 'component';
    let query = supabaseAdmin
      .from('components')
      .select('id, slug, name, description, category, tags, image_url, copy_count, created_at, user_id')
      .eq('is_public', true)
      .eq('is_temporary', false)
      .eq('type', typeFilter)
      .order('copy_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60);

    query = query.not('category', 'is', null);
    if (category) query = query.eq('category', category);
    if (tag) query = query.contains('tags', [tag]);

    const { data: components, error: componentsError } = await query;
    if (componentsError) console.error('[browse] components query error:', componentsError.message);
    list = components ?? [];

    const userIds = Array.from(new Set(list.map((c) => c.user_id).filter(Boolean)));
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);
      if (profilesError) console.error('[browse] profiles query error:', profilesError.message);
      for (const p of profiles ?? []) {
        profileMap[p.id] = p;
      }
    }
  }
} catch (err) {
  console.error('[browse] unexpected error:', err);
}
```

Update the page header dynamically:

```tsx
<h1 className="font-heading text-3xl font-bold text-ink mb-2">
  {tab === 'pages' ? 'Browse page templates' : tab === 'kits' ? 'Browse kits' : 'Browse components'}
</h1>
<p className="text-ink-2">
  {tab === 'kits'
    ? 'Curated collections of Webflow components'
    : 'Discover and copy Webflow components from the community'}
</p>
```

Replace the grid rendering section — after the guest banner, replace everything down to `</main>` with:

```tsx
{/* Kits grid */}
{tab === 'kits' ? (
  kitList.length === 0 ? (
    <div className="rounded-xl border border-border bg-surface p-16 text-center">
      <p className="font-medium text-ink mb-1">No kits yet</p>
      <p className="text-sm text-ink-3">Kits are coming — be the first to create one from your dashboard.</p>
    </div>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {kitList.map((k) => {
        const profile = profileMap[k.user_id];
        const displayName = profile?.display_name || profile?.username || 'Anonymous';
        const username = profile?.username || null;
        const componentCount = k.kit_components?.length ?? 0;
        return (
          <a
            key={k.id}
            href={`/kit/${k.slug}`}
            className="group rounded-xl border border-border bg-surface hover:border-accent/40 hover:shadow-sm transition-all flex flex-col p-5 gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-ink text-sm leading-snug group-hover:text-accent transition-colors line-clamp-2">
                {k.name}
              </h3>
              <span className="shrink-0 rounded-full bg-accent-bg px-2 py-0.5 text-xs font-medium text-accent">
                {componentCount} component{componentCount !== 1 ? 's' : ''}
              </span>
            </div>
            {k.description && (
              <p className="text-xs text-ink-2 line-clamp-2 leading-relaxed">{k.description}</p>
            )}
            <div className="mt-auto pt-3 border-t border-border flex items-center justify-between gap-2">
              {username ? (
                <span className="flex items-center gap-1.5 min-w-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={displayName} className="w-5 h-5 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-accent-bg flex items-center justify-center text-accent text-xs font-semibold shrink-0">
                      {displayName[0]?.toUpperCase()}
                    </span>
                  )}
                  <span className="text-xs text-ink-3 truncate">@{username}</span>
                </span>
              ) : (
                <span className="text-xs text-ink-3">Anonymous</span>
              )}
              <div className="flex items-center gap-1 text-xs text-ink-3 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                </svg>
                {k.copy_count > 0 ? `${k.copy_count} cop${k.copy_count === 1 ? 'y' : 'ies'}` : 'New'}
              </div>
            </div>
          </a>
        );
      })}
    </div>
  )
) : (
  /* existing component grid — keep all existing JSX here unchanged */
  list.length === 0 ? (
    /* ... existing empty state JSX ... */
  ) : (
    /* ... existing grid JSX ... */
  )
)}
```

**Important:** Keep all the existing component grid JSX intact inside the `else` branch. Only the conditional wrapper changes.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
rtk git add app/browse/page.tsx app/browse/BrowseFilters.tsx
rtk git commit -m "feat: add Components/Pages/Kits tabs to browse"
```

---

## Task 5 — Server Actions: createKit, updateKit, deleteKit

**Files:**
- Create: `app/actions/createKit.ts`
- Create: `app/actions/updateKit.ts`
- Create: `app/actions/deleteKit.ts`

- [ ] **Step 1: Create `app/actions/createKit.ts`**

```typescript
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { slugify } from '@/libs/slugify';
import supabaseAdmin from '@/libs/supabaseAdmin';

export type CreateKitResult = { error: string } | { slug: string };

export async function createKit(
  name: string,
  description: string | null,
  isPublic: boolean,
  componentIds: string[] // ordered list
): Promise<CreateKitResult> {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' };

  const userId = session.user.id;

  // Validate
  const trimmedName = name.trim();
  if (!trimmedName) return { error: 'Kit name is required' };
  if (trimmedName.length > 60) return { error: 'Kit name must be 60 characters or less' };
  if (componentIds.length < 2) return { error: 'A kit must contain at least 2 components' };
  if (componentIds.length > 20) return { error: 'A kit can contain at most 20 components' };

  // Verify all components exist, are public, and belong to this user
  const { data: components } = await supabaseAdmin
    .from('components')
    .select('id, is_public, user_id')
    .in('id', componentIds);

  if (!components || components.length !== componentIds.length) {
    return { error: 'One or more components not found' };
  }
  for (const c of components) {
    if (c.user_id !== userId) return { error: 'You can only add your own components to a kit' };
    if (!c.is_public) return { error: 'All components in a kit must be public' };
  }

  const kitId = crypto.randomUUID();
  const slug = slugify(trimmedName);

  // Insert kit
  const { error: kitError } = await supabaseAdmin.from('kits').insert({
    id: kitId,
    user_id: userId,
    name: trimmedName,
    description: description?.trim() || null,
    slug,
    is_public: isPublic,
    copy_count: 0,
  });

  if (kitError) return { error: 'Failed to create kit' };

  // Insert pivot rows
  const pivotRows = componentIds.map((cid, index) => ({
    kit_id: kitId,
    component_id: cid,
    position: index,
  }));

  const { error: pivotError } = await supabaseAdmin
    .from('kit_components')
    .insert(pivotRows);

  if (pivotError) {
    // Cleanup kit row on pivot failure
    await supabaseAdmin.from('kits').delete().eq('id', kitId);
    return { error: 'Failed to save kit components' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/browse');

  return { slug };
}
```

- [ ] **Step 2: Create `app/actions/updateKit.ts`**

```typescript
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';

export type UpdateKitResult = { error: string } | { ok: true };

export async function updateKit(
  kitId: string,
  name: string,
  description: string | null,
  isPublic: boolean,
  componentIds: string[]
): Promise<UpdateKitResult> {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' };

  const userId = session.user.id;

  // Ownership check
  const { data: kit } = await supabaseAdmin
    .from('kits')
    .select('id, user_id, slug')
    .eq('id', kitId)
    .single();

  if (!kit || kit.user_id !== userId) return { error: 'Unauthorized' };

  // Validate
  const trimmedName = name.trim();
  if (!trimmedName) return { error: 'Kit name is required' };
  if (trimmedName.length > 60) return { error: 'Kit name must be 60 characters or less' };
  if (componentIds.length < 2) return { error: 'A kit must contain at least 2 components' };
  if (componentIds.length > 20) return { error: 'A kit can contain at most 20 components' };

  // Verify components
  const { data: components } = await supabaseAdmin
    .from('components')
    .select('id, is_public, user_id')
    .in('id', componentIds);

  if (!components || components.length !== componentIds.length) {
    return { error: 'One or more components not found' };
  }
  for (const c of components) {
    if (c.user_id !== userId) return { error: 'You can only add your own components to a kit' };
    if (!c.is_public) return { error: 'All components in a kit must be public' };
  }

  // Update kit metadata
  const { error: updateError } = await supabaseAdmin
    .from('kits')
    .update({
      name: trimmedName,
      description: description?.trim() || null,
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    })
    .eq('id', kitId);

  if (updateError) return { error: 'Failed to update kit' };

  // Replace pivot rows: delete old, insert new
  await supabaseAdmin.from('kit_components').delete().eq('kit_id', kitId);

  const pivotRows = componentIds.map((cid, index) => ({
    kit_id: kitId,
    component_id: cid,
    position: index,
  }));

  const { error: pivotError } = await supabaseAdmin
    .from('kit_components')
    .insert(pivotRows);

  if (pivotError) return { error: 'Failed to update kit components' };

  revalidatePath(`/kit/${kit.slug}`);
  revalidatePath('/dashboard');
  revalidatePath('/browse');

  return { ok: true };
}
```

- [ ] **Step 3: Create `app/actions/deleteKit.ts`**

```typescript
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';

export type DeleteKitResult = { error: string } | { ok: true };

export async function deleteKit(kitId: string): Promise<DeleteKitResult> {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' };

  const userId = session.user.id;

  // Ownership check
  const { data: kit } = await supabaseAdmin
    .from('kits')
    .select('id, user_id')
    .eq('id', kitId)
    .single();

  if (!kit || kit.user_id !== userId) return { error: 'Unauthorized' };

  // kit_components rows are deleted via CASCADE
  const { error } = await supabaseAdmin.from('kits').delete().eq('id', kitId);
  if (error) return { error: 'Failed to delete kit' };

  revalidatePath('/dashboard');
  revalidatePath('/browse');

  return { ok: true };
}
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
rtk git add app/actions/createKit.ts app/actions/updateKit.ts app/actions/deleteKit.ts
rtk git commit -m "feat: add createKit, updateKit, deleteKit server actions"
```

---

## Task 6 — Kit page `/kit/[slug]`

**Files:**
- Create: `app/kit/[slug]/page.tsx`

- [ ] **Step 1: Create `app/kit/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CopyToWebflowButton from '@/components/CopyToWebflowButton';
import supabaseAdmin from '@/libs/supabaseAdmin';

interface Props {
  params: { slug: string };
}

export const dynamic = 'force-dynamic';

export default async function KitPage({ params }: Props) {
  const { slug } = params;

  // Fetch kit
  const { data: kit } = await supabaseAdmin
    .from('kits')
    .select('id, name, description, slug, is_public, copy_count, user_id, created_at')
    .eq('slug', slug)
    .single();

  if (!kit) notFound();

  // Access control for private kits
  if (!kit.is_public) {
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id !== kit.user_id) notFound();
  }

  // Fetch kit components ordered by position
  const { data: kitComponents } = await supabaseAdmin
    .from('kit_components')
    .select('position, component_id')
    .eq('kit_id', kit.id)
    .order('position', { ascending: true });

  const componentIds = (kitComponents ?? []).map((kc) => kc.component_id);

  // Fetch component details + signed URLs in parallel
  const [componentsResult, profileResult] = await Promise.all([
    componentIds.length > 0
      ? supabaseAdmin
          .from('components')
          .select('id, name, description, category, slug, is_public, json_path, image_url, copy_count')
          .in('id', componentIds)
      : Promise.resolve({ data: [] }),
    supabaseAdmin
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', kit.user_id)
      .single(),
  ]);

  const componentsRaw = componentsResult.data ?? [];
  // Restore position order
  const componentMap = Object.fromEntries(componentsRaw.map((c) => [c.id, c]));
  const components = componentIds.map((id) => componentMap[id]).filter(Boolean);

  // Generate signed URLs for available components
  const signedUrls: Record<string, string> = {};
  await Promise.all(
    components
      .filter((c) => c.is_public && c.json_path)
      .map(async (c) => {
        const { data } = await supabaseAdmin.storage
          .from('components-json')
          .createSignedUrl(c.json_path, 3600);
        if (data?.signedUrl) signedUrls[c.id] = data.signedUrl;
      })
  );

  const profile = profileResult.data;
  const displayName = profile?.display_name || profile?.username || 'Anonymous';
  const username = profile?.username || null;

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main
        className="flex-1 mx-auto w-full px-[var(--px-site)] py-16"
        style={{ maxWidth: 'var(--max-width)' }}
      >
        {/* Kit header */}
        <div className="mb-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full bg-accent-bg px-2.5 py-0.5 text-xs font-medium text-accent">
                  Kit · {components.length} component{components.length !== 1 ? 's' : ''}
                </span>
                {kit.copy_count > 0 && (
                  <span className="text-xs text-ink-3">
                    {kit.copy_count} cop{kit.copy_count === 1 ? 'y' : 'ies'}
                  </span>
                )}
              </div>
              <h1 className="font-heading text-3xl font-bold text-ink mb-2">{kit.name}</h1>
              {kit.description && (
                <p className="text-ink-2 max-w-2xl">{kit.description}</p>
              )}
            </div>

            {/* Author */}
            {username ? (
              <Link
                href={`/u/${username}`}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 hover:border-accent/40 transition-colors"
              >
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={displayName}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-accent-bg flex items-center justify-center text-accent text-sm font-semibold">
                    {displayName[0]?.toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="text-sm font-medium text-ink">{displayName}</p>
                  <p className="text-xs text-ink-3">@{username}</p>
                </div>
              </Link>
            ) : null}
          </div>
        </div>

        {/* Components list */}
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          {components.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-ink-2">No components in this kit.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {components.map((c, index) => {
                const isAvailable = c.is_public && !!signedUrls[c.id];
                return (
                  <div
                    key={c.id}
                    className={`flex items-center gap-4 px-5 py-4 ${!isAvailable ? 'opacity-50' : ''}`}
                  >
                    {/* Index */}
                    <span className="w-6 text-sm font-medium text-ink-3 shrink-0 text-center">
                      {index + 1}
                    </span>

                    {/* Preview thumbnail */}
                    {c.image_url ? (
                      <Image
                        src={c.image_url}
                        alt={c.name}
                        width={56}
                        height={40}
                        className="w-14 h-10 rounded object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-10 rounded border border-border bg-accent-bg shrink-0" />
                    )}

                    {/* Name + category */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/c/${c.slug}`}
                        className="font-medium text-sm text-ink hover:text-accent transition-colors line-clamp-1"
                      >
                        {c.name}
                      </Link>
                      {c.category && (
                        <span className="text-xs text-ink-3 capitalize">{c.category}</span>
                      )}
                    </div>

                    {/* Status / copy button */}
                    {!isAvailable ? (
                      <span className="text-xs text-ink-3 shrink-0">Unavailable</span>
                    ) : (
                      <CopyToWebflowButton
                        signedUrl={signedUrls[c.id]}
                        componentId={c.id}
                        kitId={kit.id}
                        compact
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/browse?tab=kits" className="text-sm text-ink-3 hover:text-ink transition-colors">
            ← Browse more kits
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Add `kitId` prop to CopyToWebflowButton**

Open `components/CopyToWebflowButton.tsx`. Add `kitId?: string` to its props interface and pass it as a query param when calling the copy endpoint:

The current call likely does `fetch('/api/components/${componentId}/copy', { method: 'POST' })`.
Change it to:

```typescript
const url = kitId
  ? `/api/components/${componentId}/copy?kit_id=${kitId}`
  : `/api/components/${componentId}/copy`;
fetch(url, { method: 'POST' });
```

Also add a `compact?: boolean` prop — when `true`, render a smaller button variant (e.g. `px-3 py-1.5 text-xs` instead of the default size).

- [ ] **Step 3: Update copy route to handle kit_id**

In `app/api/components/[id]/copy/route.ts`, after incrementing `component.copy_count`, add:

```typescript
// Increment kit copy_count if called from a kit page
const kitId = req.nextUrl.searchParams.get('kit_id');
if (kitId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(kitId)) {
  const { data: kit } = await supabaseAdmin
    .from('kits')
    .select('copy_count')
    .eq('id', kitId)
    .single();
  if (kit) {
    await supabaseAdmin
      .from('kits')
      .update({ copy_count: (kit.copy_count ?? 0) + 1 })
      .eq('id', kitId);
  }
}
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
rtk git add app/kit/[slug]/page.tsx components/CopyToWebflowButton.tsx app/api/components/[id]/copy/route.ts
rtk git commit -m "feat: add kit detail page and kit_id tracking on copy"
```

---

## Task 7 — Kit creation page `/kit/new`

**Files:**
- Create: `app/kit/new/page.tsx`

- [ ] **Step 1: Create `app/kit/new/page.tsx`**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createKit } from '@/app/actions/createKit';

interface ComponentOption {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
}

export default function KitNewPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [components, setComponents] = useState<ComponentOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/signin'); return; }

      const { data } = await supabase
        .from('components')
        .select('id, name, category, image_url')
        .eq('user_id', session.user.id)
        .eq('is_public', true)
        .eq('is_temporary', false)
        .order('created_at', { ascending: false });

      setComponents(data ?? []);
      setIsLoading(false);
    }
    load();
  }, [supabase, router]);

  function toggleComponent(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setSelectedIds((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    setSelectedIds((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!name.trim()) { toast.error('Kit name is required'); return; }
    if (selectedIds.length < 2) { toast.error('Select at least 2 components'); return; }

    setIsSubmitting(true);
    const result = await createKit(name, description || null, isPublic, selectedIds);
    if ('error' in result) {
      toast.error(result.error);
      setIsSubmitting(false);
    } else {
      toast.success('Kit created!');
      router.push(`/kit/${result.slug}`);
    }
  }

  const componentMap = Object.fromEntries(components.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 mx-auto w-full px-[var(--px-site)] py-16" style={{ maxWidth: 'var(--max-width)' }}>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/dashboard" className="text-sm text-ink-3 hover:text-ink transition-colors mb-4 inline-block">
              ← My library
            </Link>
            <h1 className="font-heading text-3xl font-bold text-ink mb-1">Create a kit</h1>
            <p className="text-ink-2">Group your public components into a shareable collection.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Kit name <span className="text-ink-3">(required)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="e.g. SaaS Starter Kit"
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Description <span className="text-ink-3">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="What's included in this kit?"
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors resize-none"
              />
            </div>

            {/* Visibility */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">Public kit</p>
                <p className="text-xs text-ink-3">Visible in Browse → Kits</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  isPublic ? 'bg-accent' : 'bg-border'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    isPublic ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Component selector */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Components <span className="text-ink-3">(select 2–20 public components)</span>
              </label>

              {isLoading ? (
                <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-ink-3">
                  Loading your components…
                </div>
              ) : components.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface p-8 text-center">
                  <p className="text-sm text-ink-2 mb-3">You have no public components yet.</p>
                  <Link href="/upload" className="text-sm text-accent hover:text-accent-h font-medium">
                    Upload a component →
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-white overflow-hidden divide-y divide-border">
                  {components.map((c) => {
                    const selected = selectedIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          selected ? 'bg-accent-bg' : 'hover:bg-surface'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleComponent(c.id)}
                          className="rounded border-border text-accent focus:ring-accent"
                        />
                        {c.image_url ? (
                          <img src={c.image_url} alt={c.name} className="w-10 h-7 rounded object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-10 h-7 rounded border border-border bg-accent-bg shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink line-clamp-1">{c.name}</p>
                          {c.category && <p className="text-xs text-ink-3 capitalize">{c.category}</p>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Order preview */}
            {selectedIds.length > 0 && (
              <div>
                <p className="text-sm font-medium text-ink mb-2">Order in kit</p>
                <div className="rounded-xl border border-border bg-white overflow-hidden divide-y divide-border">
                  {selectedIds.map((id, index) => {
                    const c = componentMap[id];
                    if (!c) return null;
                    return (
                      <div key={id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-5 text-xs font-medium text-ink-3 text-center shrink-0">{index + 1}</span>
                        <p className="flex-1 text-sm text-ink line-clamp-1">{c.name}</p>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            className="p-1 rounded text-ink-3 hover:text-ink disabled:opacity-30 transition-colors"
                            aria-label="Move up"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDown(index)}
                            disabled={index === selectedIds.length - 1}
                            className="p-1 rounded text-ink-3 hover:text-ink disabled:opacity-30 transition-colors"
                            aria-label="Move down"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || selectedIds.length < 2 || !name.trim()}
              className="w-full rounded-lg bg-accent hover:bg-accent-h disabled:opacity-50 text-white font-medium px-4 py-3 text-sm transition-colors"
            >
              {isSubmitting ? 'Creating…' : 'Create kit'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
rtk git add app/kit/new/page.tsx
rtk git commit -m "feat: add kit creation page /kit/new"
```

---

## Task 8 — Kit edit page `/kit/[slug]/edit`

**Files:**
- Create: `app/kit/[slug]/edit/page.tsx`

- [ ] **Step 1: Create `app/kit/[slug]/edit/page.tsx`**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { updateKit } from '@/app/actions/updateKit';

interface ComponentOption {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
}

interface Props {
  params: { slug: string };
}

export default function KitEditPage({ params }: Props) {
  const { slug } = params;
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [kitId, setKitId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [components, setComponents] = useState<ComponentOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/signin'); return; }

      // Fetch kit
      const { data: kit } = await supabase
        .from('kits')
        .select('id, name, description, is_public, user_id')
        .eq('slug', slug)
        .single();

      if (!kit || kit.user_id !== session.user.id) {
        router.push('/dashboard');
        return;
      }

      setKitId(kit.id);
      setName(kit.name);
      setDescription(kit.description ?? '');
      setIsPublic(kit.is_public);

      // Fetch existing pivot (ordered)
      const { data: pivotRows } = await supabase
        .from('kit_components')
        .select('component_id, position')
        .eq('kit_id', kit.id)
        .order('position', { ascending: true });

      // Fetch user's public components
      const { data: userComponents } = await supabase
        .from('components')
        .select('id, name, category, image_url')
        .eq('user_id', session.user.id)
        .eq('is_public', true)
        .eq('is_temporary', false)
        .order('created_at', { ascending: false });

      setComponents(userComponents ?? []);
      setSelectedIds((pivotRows ?? []).map((r) => r.component_id));
      setIsLoading(false);
    }
    load();
  }, [supabase, slug, router]);

  function toggleComponent(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setSelectedIds((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    setSelectedIds((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!name.trim()) { toast.error('Kit name is required'); return; }
    if (selectedIds.length < 2) { toast.error('Select at least 2 components'); return; }

    setIsSubmitting(true);
    const result = await updateKit(kitId, name, description || null, isPublic, selectedIds);
    if ('error' in result) {
      toast.error(result.error);
      setIsSubmitting(false);
    } else {
      toast.success('Kit updated!');
      router.push(`/kit/${slug}`);
    }
  }

  const componentMap = Object.fromEntries(components.map((c) => [c.id, c]));

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-bg">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <svg className="w-6 h-6 animate-spin text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 mx-auto w-full px-[var(--px-site)] py-16" style={{ maxWidth: 'var(--max-width)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Link href="/dashboard" className="text-sm text-ink-3 hover:text-ink transition-colors mb-4 inline-block">
              ← My library
            </Link>
            <h1 className="font-heading text-3xl font-bold text-ink mb-1">Edit kit</h1>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Kit name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={2}
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors resize-none"
              />
            </div>

            {/* Visibility */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">Public kit</p>
                <p className="text-xs text-ink-3">Visible in Browse → Kits</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  isPublic ? 'bg-accent' : 'bg-border'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    isPublic ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Component selector — same structure as /kit/new */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Components <span className="text-ink-3">(2–20 public components)</span>
              </label>
              <div className="rounded-xl border border-border bg-white overflow-hidden divide-y divide-border">
                {components.map((c) => {
                  const selected = selectedIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                        selected ? 'bg-accent-bg' : 'hover:bg-surface'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleComponent(c.id)}
                        className="rounded border-border text-accent focus:ring-accent"
                      />
                      {c.image_url ? (
                        <img src={c.image_url} alt={c.name} className="w-10 h-7 rounded object-cover border border-border shrink-0" />
                      ) : (
                        <div className="w-10 h-7 rounded border border-border bg-accent-bg shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink line-clamp-1">{c.name}</p>
                        {c.category && <p className="text-xs text-ink-3 capitalize">{c.category}</p>}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Order preview */}
            {selectedIds.length > 0 && (
              <div>
                <p className="text-sm font-medium text-ink mb-2">Order in kit</p>
                <div className="rounded-xl border border-border bg-white overflow-hidden divide-y divide-border">
                  {selectedIds.map((id, index) => {
                    const c = componentMap[id];
                    if (!c) return null;
                    return (
                      <div key={id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-5 text-xs font-medium text-ink-3 text-center shrink-0">{index + 1}</span>
                        <p className="flex-1 text-sm text-ink line-clamp-1">{c.name}</p>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => moveUp(index)} disabled={index === 0} className="p-1 rounded text-ink-3 hover:text-ink disabled:opacity-30 transition-colors" aria-label="Move up">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                          </button>
                          <button type="button" onClick={() => moveDown(index)} disabled={index === selectedIds.length - 1} className="p-1 rounded text-ink-3 hover:text-ink disabled:opacity-30 transition-colors" aria-label="Move down">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || selectedIds.length < 2 || !name.trim()}
              className="w-full rounded-lg bg-accent hover:bg-accent-h disabled:opacity-50 text-white font-medium px-4 py-3 text-sm transition-colors"
            >
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
rtk git add "app/kit/[slug]/edit/page.tsx"
rtk git commit -m "feat: add kit edit page"
```

---

## Task 9 — Dashboard: add Kits tab

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add kit fetching to the parallel Promise.all**

The dashboard currently fetches `components` and `profile` in parallel. Add kits:

```typescript
const [{ data: components }, { data: profile }, { data: kits }] = await Promise.all([
  supabaseAdmin
    .from('components')
    .select('id, name, slug, category, description, tags, image_url, is_public, copy_count, created_at, json_path, moderation_status, moderation_note')
    .eq('user_id', userId)
    .eq('is_temporary', false)
    .order('created_at', { ascending: false }),

  supabaseAdmin
    .from('profiles')
    .select('plan, component_count, username')
    .eq('id', userId)
    .single(),

  supabaseAdmin
    .from('kits')
    .select('id, name, slug, description, is_public, copy_count, created_at, kit_components(component_id)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false }),
]);
```

- [ ] **Step 2: Add tab state via URL searchParam**

Add `tab` to the page Props and read it:

```typescript
interface Props {
  searchParams: { tab?: string };
}

export default async function DashboardPage({ searchParams }: Props) {
  const activeTab = searchParams.tab === 'kits' ? 'kits' : 'components';
  // ... rest of existing code
```

- [ ] **Step 3: Add tab nav + kits UI after the plan progress bar**

Replace the existing component list section with a tabbed layout:

```tsx
{/* Tab nav */}
<div className="flex gap-2 mb-6">
  <Link
    href="/dashboard"
    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
      activeTab === 'components'
        ? 'bg-ink text-white'
        : 'bg-surface border border-border text-ink-2 hover:border-accent/40 hover:text-ink'
    }`}
  >
    Components
  </Link>
  <Link
    href="/dashboard?tab=kits"
    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
      activeTab === 'kits'
        ? 'bg-ink text-white'
        : 'bg-surface border border-border text-ink-2 hover:border-accent/40 hover:text-ink'
    }`}
  >
    Kits
  </Link>
</div>

{activeTab === 'kits' ? (
  /* Kits tab */
  <div>
    <div className="flex justify-end mb-4">
      <Link
        href="/kit/new"
        className="inline-flex items-center gap-2 rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-2 text-sm transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        New kit
      </Link>
    </div>

    {kits && kits.length > 0 ? (
      <div className="rounded-xl border border-border bg-white divide-y divide-border">
        {kits.map((kit) => {
          const componentCount = kit.kit_components?.length ?? 0;
          return (
            <div key={kit.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link href={`/kit/${kit.slug}`} className="font-medium text-sm text-ink hover:text-accent transition-colors line-clamp-1">
                    {kit.name}
                  </Link>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${kit.is_public ? 'bg-accent-bg text-accent' : 'bg-surface text-ink-3 border border-border'}`}>
                    {kit.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
                <p className="text-xs text-ink-3">
                  {componentCount} component{componentCount !== 1 ? 's' : ''} · {kit.copy_count} cop{kit.copy_count === 1 ? 'y' : 'ies'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/kit/${kit.slug}/edit`}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-2 hover:text-ink hover:border-accent/40 transition-colors"
                >
                  Edit
                </Link>
                <KitDeleteButton kitId={kit.id} />
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="rounded-xl border border-border bg-surface p-16 text-center">
        <p className="font-medium text-ink mb-1">No kits yet</p>
        <p className="text-sm text-ink-3 mb-6">Group your public components into shareable kits.</p>
        <Link href="/kit/new" className="inline-flex items-center rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-2 text-sm transition-colors">
          Create your first kit
        </Link>
      </div>
    )}
  </div>
) : (
  /* Components tab — existing JSX unchanged */
  ...
)}
```

- [ ] **Step 4: Create `app/dashboard/KitDeleteButton.tsx`**

The delete button needs to be a Client Component because it calls a Server Action with confirmation:

```tsx
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { deleteKit } from '@/app/actions/deleteKit';

interface Props {
  kitId: string;
}

export default function KitDeleteButton({ kitId }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteKit(kitId);
    if ('error' in result) {
      toast.error(result.error);
      setIsDeleting(false);
      setConfirming(false);
    } else {
      toast.success('Kit deleted');
      router.refresh();
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {isDeleting ? 'Deleting…' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-2 hover:text-ink transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
    >
      Delete
    </button>
  );
}
```

Add `import KitDeleteButton from './KitDeleteButton'` to `dashboard/page.tsx`.

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
rtk git add app/dashboard/page.tsx app/dashboard/KitDeleteButton.tsx
rtk git commit -m "feat: add Kits tab to dashboard with create/edit/delete"
```

---

## Task 10 — Final: push to Vercel

- [ ] **Step 1: Full typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no build errors. Check the route summary — you should see:
- `/kit/[slug]` (dynamic)
- `/kit/new` (dynamic)
- `/kit/[slug]/edit` (dynamic)

- [ ] **Step 3: Push**

```bash
rtk git push
```

Vercel will auto-deploy from `main`. Monitor the deployment in the Vercel dashboard.

**Post-deploy checklist (manual):**
1. Run the SQL migration in Supabase Dashboard (Task 1, Step 2) if not done yet
2. Go to `/browse` — verify 3 tabs appear
3. Go to `/upload`, paste a Webflow component — verify the type toggle appears
4. Create a kit from `/dashboard?tab=kits` → "New kit"
5. Verify the kit appears at `/kit/[slug]`
6. Verify copy button on kit page increments both component and kit copy_count

---

## Spec coverage check

| Spec requirement | Task |
|---|---|
| `type` column on components | Task 1 + 3 |
| Upload type toggle | Task 2 |
| Dynamic categories per type | Task 2 |
| Browse tabs (Components / Pages / Kits) | Task 4 |
| Category filter per tab | Task 4 |
| `kits` + `kit_components` tables + RLS | Task 1 |
| createKit / updateKit / deleteKit | Task 5 |
| `/kit/[slug]` page | Task 6 |
| Unavailable components shown greyed | Task 6 |
| `?kit_id` on copy endpoint | Task 6 |
| `/kit/new` — form + selector + reorder | Task 7 |
| `/kit/[slug]/edit` | Task 8 |
| Dashboard Kits tab | Task 9 |
| Free limit covers components + page templates | Enforced by existing `component_count` logic — no change needed |
