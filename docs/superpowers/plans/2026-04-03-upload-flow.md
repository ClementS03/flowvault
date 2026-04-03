# Upload Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full upload flow — paste detection, slide-over config form, Server Actions for component creation/claiming, and a result page with component card + sign-in panel.

**Architecture:** Client component paste zone → slide-over form → `createComponent` Server Action (stores JSON + image in Supabase Storage, inserts DB row) → result page (unauthenticated) or `/c/[slug]` (authenticated). Auth callback extended to claim temp components on sign-in.

**Tech Stack:** Next.js 14 App Router, Server Actions, Supabase Auth Helpers, Supabase Storage, bcryptjs, Tailwind CSS

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `libs/slugify.ts` | Create | Generate `name-slug-6chars` |
| `libs/hashPassword.ts` | Create | bcrypt hash + verify |
| `libs/supabaseAdmin.ts` | Create | Supabase service-role client |
| `app/actions/createComponent.ts` | Create | Server Action: validate, upload, insert |
| `app/actions/claimComponent.ts` | Create | Server Action: link temp → user |
| `app/upload/page.tsx` | Rewrite | Client component, window paste event |
| `components/UploadSlideOver.tsx` | Create | Slide-over form + image preview |
| `app/upload/result/page.tsx` | Create | Component card \| OR \| sign-in panel |
| `app/api/auth/callback/route.ts` | Modify | Pass slug through to trigger claim |
| `app/api/components/[id]/copy/route.ts` | Create | Increment copy_count |
| `components/CopyLinkButton.tsx` | Create | Copy URL to clipboard |
| `components/CopyToWebflowButton.tsx` | Create | Fetch JSON + copy to Webflow clipboard |
| `components/ResultSignInPanel.tsx` | Create | Sign-in form with slug in redirectTo |

---

### Task 1: DB migration

**Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)**

- [ ] **Step 1: Run the migration**

```sql
-- New columns on components
ALTER TABLE public.components
  ADD COLUMN IF NOT EXISTS is_temporary boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at    timestamptz,
  ADD COLUMN IF NOT EXISTS image_url     text,
  ADD COLUMN IF NOT EXISTS password_hash text;

-- Allow anonymous inserts (Server Action controls user_id — never set by client)
CREATE POLICY IF NOT EXISTS "Anyone can insert component"
  ON public.components FOR INSERT
  WITH CHECK (true);

-- Allow reading temporary public components
DROP POLICY IF EXISTS "Public read" ON public.components;
CREATE POLICY "Public read"
  ON public.components FOR SELECT
  USING (
    is_public = true
    AND (is_temporary = false OR expires_at > now())
  );
```

- [ ] **Step 2: Enable pg_cron cleanup (optional but recommended)**

In Supabase Dashboard → Database → Extensions → enable `pg_cron`, then run:
```sql
SELECT cron.schedule(
  'cleanup-temp-components',
  '0 * * * *',
  $$DELETE FROM public.components WHERE is_temporary = true AND expires_at < now()$$
);
```

- [ ] **Step 3: Create the `component-previews` storage bucket**

In Supabase Dashboard → Storage → New bucket:
- Name: `component-previews`
- Public: **YES** (preview images are publicly readable)

- [ ] **Step 4: Add `NEXT_PUBLIC_APP_URL` to `.env.local`**

```bash
# In .env.local — add this line:
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 6: Verify migration**

Run in SQL Editor:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'components'
ORDER BY column_name;
```
Expected: `expires_at`, `image_url`, `is_temporary`, `password_hash` appear in the list.

---

### Task 2: Install bcryptjs

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

- [ ] **Step 2: Verify**

```bash
rtk tsc --noEmit 2>&1 | head -5
```
Expected: same errors as before (blog images) — no new errors.

---

### Task 3: Create `libs/slugify.ts`

**Files:**
- Create: `libs/slugify.ts`

- [ ] **Step 1: Write the file**

```typescript
/**
 * Generate a URL-safe slug from a component name.
 * Format: {name-slug}-{6 random chars}
 * Example: "Hero Section" → "hero-section-a3f8x2"
 */
function randomSuffix(length = 6): string {
  return Math.random().toString(36).slice(2, 2 + length).padEnd(length, '0');
}

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'component';
  return `${base}-${randomSuffix(6)}`;
}
```

- [ ] **Step 2: Quick smoke-test in terminal**

```bash
cd "C:/Users/cleme/Downloads/Projets web/flowvault"
node -e "
const { slugify } = require('./libs/slugify.ts')
" 2>&1 | head -3
```

Since it's TypeScript, verify via type check instead:
```bash
rtk tsc --noEmit 2>&1 | grep slugify
```
Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
rtk git add libs/slugify.ts && rtk git commit -m "feat: add slugify utility"
```

---

### Task 4: Create `libs/hashPassword.ts`

**Files:**
- Create: `libs/hashPassword.ts`

- [ ] **Step 1: Write the file**

```typescript
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | grep hashPassword
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
rtk git add libs/hashPassword.ts && rtk git commit -m "feat: add bcrypt password utilities"
```

---

### Task 5: Create `libs/supabaseAdmin.ts`

**Files:**
- Create: `libs/supabaseAdmin.ts`

- [ ] **Step 1: Write the file**

```typescript
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase admin client using the service role key.
 * Bypasses RLS — only use in Server Actions / API routes, never in client code.
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default supabaseAdmin;
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | grep supabaseAdmin
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
rtk git add libs/supabaseAdmin.ts && rtk git commit -m "feat: add supabase admin client"
```

---

### Task 6: Create `app/actions/createComponent.ts`

**Files:**
- Create: `app/actions/createComponent.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p "app/actions"
```

- [ ] **Step 2: Write the Server Action**

```typescript
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { slugify } from '@/libs/slugify';
import { hashPassword } from '@/libs/hashPassword';
import supabaseAdmin from '@/libs/supabaseAdmin';

export async function createComponent(
  formData: FormData,
  jsonString: string
): Promise<{ slug: string }> {
  // Get current user (may be null for anonymous users)
  const supabase = createServerActionClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;

  // Parse form fields
  const name = (formData.get('name') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const category = (formData.get('category') as string) || null;
  const tagsRaw = (formData.get('tags') as string) || '';
  const tags = tagsRaw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);
  const isPublic = formData.get('is_public') === 'true';
  const passwordRaw = (formData.get('password') as string) || null;
  const imageFile = formData.get('preview_image') as File | null;

  if (!name) throw new Error('Component name is required');
  if (name.length > 60) throw new Error('Name must be 60 characters or less');

  // Validate Webflow JSON
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.type !== '@webflow/XscpData') {
      throw new Error('Invalid Webflow component data');
    }
  } catch {
    throw new Error('Invalid component JSON');
  }

  const componentId = crypto.randomUUID();
  const slug = slugify(name);

  // Upload JSON to Supabase Storage
  const jsonPath = userId
    ? `${userId}/${componentId}.json`
    : `anonymous/${componentId}.json`;

  const { error: jsonError } = await supabaseAdmin.storage
    .from('components-json')
    .upload(jsonPath, new Blob([jsonString], { type: 'application/json' }), {
      contentType: 'application/json',
    });

  if (jsonError) throw new Error('Failed to store component data');

  // Upload preview image if provided
  let imageUrl: string | null = null;
  if (imageFile && imageFile.size > 0) {
    const imagePath = `${componentId}.jpg`;
    const { error: imgError } = await supabaseAdmin.storage
      .from('component-previews')
      .upload(imagePath, imageFile, {
        contentType: imageFile.type,
        upsert: true,
      });

    if (!imgError) {
      const {
        data: { publicUrl },
      } = supabaseAdmin.storage
        .from('component-previews')
        .getPublicUrl(imagePath);
      imageUrl = publicUrl;
    }
  }

  // Hash password if component is password-protected
  let passwordHash: string | null = null;
  if (!isPublic && passwordRaw) {
    passwordHash = await hashPassword(passwordRaw);
  }

  // Insert component row
  const isTemporary = !userId;
  const expiresAt = isTemporary
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error: insertError } = await supabaseAdmin.from('components').insert({
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
  });

  if (insertError) {
    // Clean up storage on DB failure
    await supabaseAdmin.storage.from('components-json').remove([jsonPath]);
    throw new Error('Failed to save component');
  }

  // Increment component_count for logged-in users
  if (userId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('component_count')
      .eq('id', userId)
      .single();

    await supabaseAdmin
      .from('profiles')
      .update({ component_count: (profile?.component_count ?? 0) + 1 })
      .eq('id', userId);
  }

  return { slug };
}
```

- [ ] **Step 3: Type check**

```bash
rtk tsc --noEmit 2>&1 | grep -v "blog\|icon.png"
```
Expected: no output beyond the pre-existing blog errors.

- [ ] **Step 4: Commit**

```bash
rtk git add app/actions/createComponent.ts && rtk git commit -m "feat: createComponent server action"
```

---

### Task 7: Create `app/actions/claimComponent.ts`

**Files:**
- Create: `app/actions/claimComponent.ts`

- [ ] **Step 1: Write the Server Action**

```typescript
'use server';

import supabaseAdmin from '@/libs/supabaseAdmin';

/**
 * Associate a temporary (anonymous) component with a newly authenticated user.
 * Called from the auth callback route when a slug query param is present.
 */
export async function claimComponent(
  slug: string,
  userId: string
): Promise<void> {
  // Fetch the temp component
  const { data: component, error: fetchError } = await supabaseAdmin
    .from('components')
    .select('id, json_path, is_temporary, user_id')
    .eq('slug', slug)
    .single();

  if (fetchError || !component) return; // Component not found — silently skip
  if (!component.is_temporary) return;  // Already claimed — skip
  if (component.user_id !== null) return; // Belongs to someone else — skip

  // Move JSON from anonymous/ to userId/
  let newJsonPath = component.json_path;
  if (component.json_path.startsWith('anonymous/')) {
    newJsonPath = `${userId}/${component.id}.json`;
    await supabaseAdmin.storage
      .from('components-json')
      .move(component.json_path, newJsonPath);
  }

  // Claim the component
  await supabaseAdmin
    .from('components')
    .update({
      user_id: userId,
      is_temporary: false,
      expires_at: null,
      json_path: newJsonPath,
    })
    .eq('id', component.id);

  // Update component count
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('component_count')
    .eq('id', userId)
    .single();

  await supabaseAdmin
    .from('profiles')
    .update({ component_count: (profile?.component_count ?? 0) + 1 })
    .eq('id', userId);
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | grep -v "blog\|icon.png"
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
rtk git add app/actions/claimComponent.ts && rtk git commit -m "feat: claimComponent server action"
```

---

### Task 8: Modify `app/api/auth/callback/route.ts`

**Files:**
- Modify: `app/api/auth/callback/route.ts`

- [ ] **Step 1: Update the route to handle slug claim**

Replace the entire file with:

```typescript
import { NextResponse, NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { claimComponent } from '@/app/actions/claimComponent';
import config from '@/config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  const slug = requestUrl.searchParams.get('slug');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // If a temp component slug is present, claim it for this user
    if (slug && data.session?.user?.id) {
      await claimComponent(slug, data.session.user.id);
    }
  }

  return NextResponse.redirect(requestUrl.origin + config.auth.callbackUrl);
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | grep -v "blog\|icon.png"
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
rtk git add app/api/auth/callback/route.ts && rtk git commit -m "feat: pass slug through auth callback for component claim"
```

---

### Task 9: Create `components/UploadSlideOver.tsx`

**Files:**
- Create: `components/UploadSlideOver.tsx`

- [ ] **Step 1: Write the component**

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createComponent } from '@/app/actions/createComponent';

const CATEGORIES = [
  { value: '', label: 'No category' },
  { value: 'hero', label: 'Hero' },
  { value: 'navbar', label: 'Navbar' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'footer', label: 'Footer' },
  { value: 'feature', label: 'Feature' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

interface Props {
  json: string;
  onClose: () => void;
}

export default function UploadSlideOver({ json, onClose }: Props) {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
  }, [supabase]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set('is_public', String(isPublic));
      const { slug } = await createComponent(formData, json);
      router.push(isLoggedIn ? `/c/${slug}` : `/upload/result?slug=${slug}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-bg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading font-semibold text-ink">
            Configure your component
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-surface transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5"
        >
          {/* Preview image */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Preview image <span className="text-ink-3 font-normal">(optional)</span>
            </label>
            <div
              className="relative w-full h-36 rounded-lg border border-dashed border-border bg-surface flex items-center justify-center cursor-pointer hover:border-accent hover:bg-accent-bg transition-colors overflow-hidden"
              onClick={() => imageInputRef.current?.click()}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-ink-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3.75 3h16.5M21 3.75v13.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V3.75" />
                  </svg>
                  <span className="text-xs">Click to upload (JPEG/PNG, max 2MB)</span>
                </div>
              )}
            </div>
            <input
              ref={imageInputRef}
              name="preview_image"
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={60}
              placeholder="e.g. Hero Section"
              className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-ink mb-1.5">
              Description <span className="text-ink-3 font-normal">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              maxLength={200}
              rows={3}
              placeholder="What does this component do?"
              className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors resize-none"
            />
          </div>

          {/* Category + Tags row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-ink mb-1.5">
                Category
              </label>
              <select
                id="category"
                name="category"
                className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-ink mb-1.5">
                Tags
              </label>
              <input
                id="tags"
                name="tags"
                type="text"
                placeholder="hero, dark, minimal"
                className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
              />
              <p className="mt-1 text-xs text-ink-3">Comma-separated, max 5</p>
            </div>
          </div>

          {/* Visibility toggles */}
          <div className="border-t border-border pt-4 flex flex-col gap-3">
            {/* Public toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink">Make public</p>
                <p className="text-xs text-ink-3">Anyone can find and copy this component</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                  isPublic ? 'bg-accent' : 'bg-ink-3'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                    isPublic ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Password field (shown when not public) */}
            {!isPublic && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
                  Password protect
                </label>
                <input
                  id="password"
                  name="password"
                  type="text"
                  placeholder="Set a password"
                  className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
                />
                <p className="mt-1 text-xs text-ink-3">
                  Anyone with the link will need this password to copy the component
                </p>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="border-t border-border pt-4 pb-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-3 text-sm transition-colors disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving…
                </>
              ) : isLoggedIn ? (
                'Publish component'
              ) : (
                'Get share link'
              )}
            </button>
            {!isLoggedIn && (
              <p className="mt-2 text-center text-xs text-ink-3">
                No account needed — sign in later to store it permanently.
              </p>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | grep -v "blog\|icon.png"
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
rtk git add components/UploadSlideOver.tsx && rtk git commit -m "feat: UploadSlideOver component with form + image preview"
```

---

### Task 10: Rewrite `app/upload/page.tsx`

**Files:**
- Modify: `app/upload/page.tsx`

- [ ] **Step 1: Rewrite as client component**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import UploadSlideOver from '@/components/UploadSlideOver';

export default function UploadPage() {
  const [detectedJson, setDetectedJson] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    // Don't intercept pastes inside form fields
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    const json = e.clipboardData?.getData('application/json');
    if (!json) return;

    try {
      const parsed = JSON.parse(json);
      if (parsed.type !== '@webflow/XscpData') {
        toast.error("That doesn't look like a Webflow component. Copy an element from the Designer first.");
        return;
      }
      setIsDetecting(true);
      // Brief visual feedback before opening slide-over
      setTimeout(() => {
        setDetectedJson(json);
        setIsDetecting(false);
      }, 400);
    } catch {
      toast.error("That doesn't look like a Webflow component.");
    }
  }, []);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  function handleClose() {
    setDetectedJson(null);
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 flex items-center justify-center px-[var(--px-site)] py-16">
        <div className="w-full max-w-2xl mx-auto text-center">
          <h1 className="font-heading text-3xl font-bold text-ink mb-2">
            Upload a component
          </h1>
          <p className="text-ink-2 mb-10">
            Copy any element from the Webflow Designer (Ctrl+C), then paste it here (Ctrl+V).
          </p>

          {/* Paste zone */}
          <div
            className={`rounded-xl border-2 border-dashed p-16 text-center transition-all duration-200 ${
              isDetecting
                ? 'border-accent bg-accent-bg scale-[0.98]'
                : 'border-border bg-surface hover:border-accent hover:bg-accent-bg'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isDetecting ? 'bg-accent' : 'bg-accent-bg'
              }`}>
                {isDetecting ? (
                  <svg className="w-7 h-7 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                )}
              </div>
              <p className={`font-medium text-lg transition-colors ${isDetecting ? 'text-accent' : 'text-ink'}`}>
                {isDetecting ? 'Component detected!' : 'Paste your Webflow component here'}
              </p>
              <p className="text-sm text-ink-3">
                {isDetecting
                  ? 'Opening configuration…'
                  : 'Press Ctrl+V after copying from the Webflow Designer'}
              </p>
            </div>
          </div>

          <p className="mt-6 text-xs text-ink-3">
            No account required — get a share link instantly.{' '}
            <a href="/signin" className="underline hover:text-ink-2">Sign in</a> to save permanently.
          </p>
        </div>
      </main>

      {/* Slide-over */}
      {detectedJson && (
        <UploadSlideOver json={detectedJson} onClose={handleClose} />
      )}

      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | grep -v "blog\|icon.png"
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
rtk git add app/upload/page.tsx && rtk git commit -m "feat: upload page with paste detection and slide-over"
```

---

### Task 11: Create `app/upload/result/page.tsx`

**Files:**
- Create: `app/upload/result/page.tsx`

- [ ] **Step 1: Create directory**

```bash
mkdir -p "app/upload/result"
```

- [ ] **Step 2: Write the result page**

```typescript
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import supabaseAdmin from '@/libs/supabaseAdmin';
import ResultSignInPanel from '@/components/ResultSignInPanel';
import CopyLinkButton from '@/components/CopyLinkButton';
import CopyToWebflowButton from '@/components/CopyToWebflowButton';

interface Props {
  searchParams: { slug?: string };
}

export const dynamic = 'force-dynamic';

export default async function ResultPage({ searchParams }: Props) {
  const { slug } = searchParams;
  if (!slug) notFound();

  // Use admin client so signed URL works regardless of auth state
  const { data: component } = await supabaseAdmin
    .from('components')
    .select('id, name, description, category, image_url, is_temporary, expires_at, json_path, is_public')
    .eq('slug', slug)
    .single();

  if (!component) notFound();

  // Signed URL via admin so it works for anonymous (no session) visitors
  const { data: signedData } = await supabaseAdmin.storage
    .from('components-json')
    .createSignedUrl(component.json_path, 3600); // 1 hour

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/c/${slug}`;

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 flex items-center justify-center px-[var(--px-site)] py-16">
        <div className="w-full max-w-4xl mx-auto">
          {/* Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-4 py-1.5 text-sm font-medium text-green-700 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Your component is ready
            </div>
            <h1 className="font-heading text-3xl font-bold text-ink">
              {component.name}
            </h1>
            {component.description && (
              <p className="mt-2 text-ink-2">{component.description}</p>
            )}
          </div>

          {/* Two-column layout */}
          <div className="flex flex-col lg:flex-row items-stretch gap-0">
            {/* Component card */}
            <div className="flex-1 rounded-2xl lg:rounded-r-none border border-border bg-surface p-8 flex flex-col gap-6">
              {/* Preview image */}
              <div className="w-full aspect-video rounded-lg bg-bg border border-border overflow-hidden flex items-center justify-center">
                {component.image_url ? (
                  <img
                    src={component.image_url}
                    alt={component.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-ink-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3.75 3h16.5M21 3.75v13.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V3.75" />
                    </svg>
                    <span className="text-xs">No preview</span>
                  </div>
                )}
              </div>

              {/* Category badge */}
              {component.category && (
                <span className="self-start inline-flex items-center rounded-full bg-accent-bg px-2.5 py-0.5 text-xs font-medium text-accent capitalize">
                  {component.category}
                </span>
              )}

              {/* Share link */}
              <div>
                <p className="text-xs font-medium text-ink-3 uppercase tracking-widest mb-2">Share link</p>
                <CopyLinkButton url={shareUrl} />
              </div>

              {/* Copy to Webflow */}
              <CopyToWebflowButton
                componentId={component.id}
                signedJsonUrl={signedData?.signedUrl ?? null}
              />

              {/* Expiry notice */}
              {component.is_temporary && (
                <p className="text-xs text-ink-3 text-center">
                  This link expires in ~24h. Sign in to store it permanently.
                </p>
              )}
            </div>

            {/* OR divider */}
            <div className="hidden lg:flex flex-col items-center justify-center px-6 relative">
              <div className="w-px flex-1 bg-border" />
              <div className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-semibold text-ink-3 my-3 shrink-0">
                OR
              </div>
              <div className="w-px flex-1 bg-border" />
            </div>

            {/* Mobile OR divider */}
            <div className="flex lg:hidden items-center gap-4 py-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-semibold text-ink-3">OR</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Sign-in panel */}
            <div className="flex-1 rounded-2xl lg:rounded-l-none border border-border lg:border-l-0 bg-bg p-8">
              <ResultSignInPanel slug={slug} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Create `components/CopyLinkButton.tsx`**

```typescript
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1 min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink-2 truncate">
        {url}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 rounded-lg border border-border bg-surface hover:bg-accent-bg hover:border-accent px-3 py-2 text-sm font-medium text-ink-2 hover:text-accent transition-colors"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create `components/CopyToWebflowButton.tsx`**

```typescript
'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { copyToWebflow } from '@/libs/copyToWebflow';

interface Props {
  componentId: string;
  signedJsonUrl: string | null;
}

export default function CopyToWebflowButton({ componentId, signedJsonUrl }: Props) {
  const [isCopying, setIsCopying] = useState(false);

  async function handleCopy() {
    if (!signedJsonUrl) {
      toast.error('Component data unavailable.');
      return;
    }

    setIsCopying(true);
    try {
      const res = await fetch(signedJsonUrl);
      if (!res.ok) throw new Error('Failed to fetch component data');
      const json = await res.text();

      const bridge = document.getElementById('clipboard-bridge') as HTMLTextAreaElement | null;
      if (!bridge) throw new Error('Clipboard bridge not found');

      const success = copyToWebflow(json, bridge);
      if (success) {
        toast.success('Copied! Paste in Webflow Designer (Ctrl+V)');
        // Track the copy
        fetch(`/api/components/${componentId}/copy`, { method: 'POST' }).catch(() => {});
      } else {
        toast.error('Copy failed. Try again.');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Something went wrong.');
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={isCopying || !signedJsonUrl}
      className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-3 text-sm transition-colors disabled:opacity-50"
    >
      {isCopying ? (
        <>
          <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Copying…
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          Copy to Webflow
        </>
      )}
    </button>
  );
}
```

- [ ] **Step 5: Create `components/ResultSignInPanel.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';

export default function ResultSignInPanel({ slug }: { slug: string }) {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Build redirectTo so callback can claim the component
  const redirectURL =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/auth/callback?slug=${slug}`
      : `/api/auth/callback?slug=${slug}`;

  async function handleGoogle() {
    setIsLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectURL },
    });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectURL },
      });
      toast.success('Check your email!');
      setEmailSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-3 mb-2">Save it forever</p>
      <h2 className="font-heading text-xl font-bold text-ink mb-4">
        Sign in to store &amp; share
      </h2>

      {/* Benefits */}
      <ul className="flex flex-col gap-2 mb-6">
        {[
          'Permanent share link',
          'Track how many times it\'s been copied',
          'Up to 10 free components',
        ].map((benefit) => (
          <li key={benefit} className="flex items-center gap-2.5 text-sm text-ink-2">
            <div className="w-5 h-5 rounded bg-accent-bg flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-accent">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
            </div>
            {benefit}
          </li>
        ))}
      </ul>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-surface hover:bg-accent-bg px-4 py-2.5 text-sm font-medium text-ink transition-colors disabled:opacity-50 mb-4"
      >
        <svg className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
          <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
          <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-ink-3">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Magic link form */}
      {emailSent ? (
        <div className="rounded-lg bg-accent-bg border border-accent/20 px-4 py-3 text-sm text-accent text-center">
          Magic link sent — check your inbox.
        </div>
      ) : (
        <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-2.5 text-sm transition-colors disabled:opacity-50"
          >
            {isLoading && (
              <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Send Magic Link
          </button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Type check**

```bash
rtk tsc --noEmit 2>&1 | grep -v "blog\|icon.png"
```
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
rtk git add app/upload/result/ components/CopyLinkButton.tsx components/CopyToWebflowButton.tsx components/ResultSignInPanel.tsx && rtk git commit -m "feat: upload result page with component card and sign-in panel"
```

---

### Task 12: Create `app/api/components/[id]/copy/route.ts`

**Files:**
- Create: `app/api/components/[id]/copy/route.ts`

- [ ] **Step 1: Create directories and file**

```bash
mkdir -p "app/api/components/[id]/copy"
```

- [ ] **Step 2: Write the route**

```typescript
import { NextResponse, NextRequest } from 'next/server';
import supabaseAdmin from '@/libs/supabaseAdmin';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const { error } = await supabaseAdmin.rpc('increment_copy_count', {
    component_id: id,
  });

  // If the RPC doesn't exist yet, fall back to a direct update
  if (error) {
    const { data: component } = await supabaseAdmin
      .from('components')
      .select('copy_count')
      .eq('id', id)
      .single();

    await supabaseAdmin
      .from('components')
      .update({ copy_count: (component?.copy_count ?? 0) + 1 })
      .eq('id', id);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
rtk git add "app/api/components/" && rtk git commit -m "feat: copy-count API endpoint"
```

---

### Task 13: Smoke test end-to-end

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test unauthenticated flow**

1. Open `http://localhost:3000/upload`
2. Open Webflow Designer, copy any element (Ctrl+C)
3. Click back to the browser, press Ctrl+V
4. Verify: paste zone shows "Component detected!", slide-over opens from the right
5. Fill in Name: "Test Hero", leave other fields blank
6. Click "Get share link"
7. Verify: redirect to `/upload/result?slug=test-hero-xxxxxx`
8. Verify: component card shows with name, share link, "Copy to Webflow" button
9. Verify: sign-in panel shows on the right with Google + magic link

- [ ] **Step 3: Test Copy to Webflow**

1. On the result page, click "Copy to Webflow"
2. Switch to Webflow Designer
3. Press Ctrl+V in the canvas
4. Verify: the component pastes correctly

- [ ] **Step 4: Test invalid paste**

1. Copy any regular text (not a Webflow component)
2. Press Ctrl+V on the upload page
3. Verify: toast error appears, slide-over does NOT open

- [ ] **Step 5: Final commit**

```bash
rtk git add -A && rtk git commit -m "feat: upload flow complete — paste detection, slide-over, result page"
```
