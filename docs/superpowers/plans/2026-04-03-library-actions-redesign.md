# Library Actions Redesign + README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the dashboard library row with proper SVG buttons, tooltips, red delete far-right, a mobile 3-dot dropdown, an edit modal for component metadata, and rewrite the README.

**Architecture:** `ComponentRow` is a Client Component — it gains a mobile dropdown (click-outside `useRef`) and wires to a new `EditComponentModal` (portal-less modal overlay, own file). A new `updateComponent` Server Action handles name/description/category/tags/is_public/image updates with ownership validation and storage cleanup. The README replaces the ShipFast boilerplate with a proper FlowVault presentation.

**Tech Stack:** Next.js 14 App Router · Server Actions · Supabase Storage · Tailwind CSS · react-hot-toast

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/actions/updateComponent.ts` | Create | Server Action — update metadata + optional image replace/remove |
| `components/EditComponentModal.tsx` | Create | Modal overlay — edit form, calls updateComponent |
| `components/ComponentRow.tsx` | Modify | SVG buttons, tooltips, red delete, Edit button, mobile dropdown |
| `README.md` | Modify | Full rewrite — FlowVault presentation |

---

## Task 1: `updateComponent` Server Action

**Files:**
- Create: `app/actions/updateComponent.ts`

- [ ] **Step 1: Create the file with ownership check + field update (no image handling yet)**

```typescript
// app/actions/updateComponent.ts
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';

export type UpdateComponentResult = { error: string } | { ok: true };

export async function updateComponent(
  id: string,
  formData: FormData
): Promise<UpdateComponentResult> {
  // 1. Auth
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' };

  // 2. Ownership + fetch current row (need slug + image_url for revalidate + cleanup)
  const { data: component } = await supabaseAdmin
    .from('components')
    .select('id, user_id, slug, image_url')
    .eq('id', id)
    .single();

  if (!component || component.user_id !== session.user.id) {
    return { error: 'Unauthorized' };
  }

  // 3. Parse fields
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
  const removeImage = formData.get('remove_image') === 'true';
  const imageFile = formData.get('preview_image') as File | null;

  // 4. Validate
  if (!name) return { error: 'Name is required' };
  if (name.length > 60) return { error: 'Name must be 60 characters or less' };
  if (description && description.length > 200) return { error: 'Description must be 200 characters or less' };

  // 5. Handle image
  let imageUrl: string | null | undefined = undefined; // undefined = no change

  if (removeImage) {
    // Delete old image from storage if it exists
    if (component.image_url) {
      // Path is "{componentId}.jpg" or "{componentId}.png" in component-previews bucket
      await Promise.all([
        supabaseAdmin.storage.from('component-previews').remove([`${id}.jpg`]),
        supabaseAdmin.storage.from('component-previews').remove([`${id}.png`]),
      ]);
    }
    imageUrl = null;
  } else if (imageFile && imageFile.size > 0) {
    // Validate
    if (!['image/jpeg', 'image/png'].includes(imageFile.type)) {
      return { error: 'Preview image must be a JPEG or PNG file' };
    }
    if (imageFile.size > 2 * 1024 * 1024) {
      return { error: 'Preview image must be under 2MB' };
    }

    // Delete old images first (both extensions — one will 404, errors intentionally ignored)
    await Promise.all([
      supabaseAdmin.storage.from('component-previews').remove([`${id}.jpg`]),
      supabaseAdmin.storage.from('component-previews').remove([`${id}.png`]),
    ]);

    const ext = imageFile.type === 'image/png' ? 'png' : 'jpg';
    const imagePath = `${id}.${ext}`;

    const { error: imgError } = await supabaseAdmin.storage
      .from('component-previews')
      .upload(imagePath, imageFile, { contentType: imageFile.type, upsert: true });

    if (imgError) {
      return { error: 'Failed to upload preview image' };
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('component-previews')
      .getPublicUrl(imagePath);
    imageUrl = publicUrl;
  }

  // 6. Build update payload — only include image_url if it changed
  const updatePayload: Record<string, unknown> = {
    name,
    description,
    category,
    tags,
    is_public: isPublic,
    updated_at: new Date().toISOString(),
  };
  if (imageUrl !== undefined) {
    updatePayload.image_url = imageUrl;
  }

  // 7. Update DB
  const { error: updateError } = await supabaseAdmin
    .from('components')
    .update(updatePayload)
    .eq('id', id);

  if (updateError) return { error: 'Failed to update component' };

  // 8. Revalidate
  revalidatePath('/dashboard');
  revalidatePath(`/c/${component.slug}`);
  revalidatePath('/browse');

  return { ok: true };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `rtk npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
rtk git add app/actions/updateComponent.ts
rtk git commit -m "feat: updateComponent server action (name, description, category, tags, image)"
```

---

## Task 2: `EditComponentModal` Component

**Files:**
- Create: `components/EditComponentModal.tsx`

- [ ] **Step 1: Create the modal component**

```typescript
// components/EditComponentModal.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { updateComponent } from '@/app/actions/updateComponent';

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

interface EditComponentModalProps {
  id: string;
  initialName: string;
  initialDescription: string | null;
  initialCategory: string | null;
  initialTags: string[];
  initialIsPublic: boolean;
  initialImageUrl: string | null;
  onClose: () => void;
}

export default function EditComponentModal({
  id,
  initialName,
  initialDescription,
  initialCategory,
  initialTags,
  initialIsPublic,
  initialImageUrl,
  onClose,
}: EditComponentModalProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [category, setCategory] = useState(initialCategory ?? '');
  const [tags, setTags] = useState(initialTags.join(', '));
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(initialImageUrl);
  const [removeImage, setRemoveImage] = useState(false);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Only JPEG or PNG accepted.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Max 2 MB.');
      return;
    }
    setNewImageFile(file);
    setRemoveImage(false);
    setPreviewImageUrl(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    setRemoveImage(true);
    setNewImageFile(null);
    setPreviewImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData();
    formData.set('name', name);
    formData.set('description', description);
    formData.set('category', category);
    formData.set('tags', tags);
    formData.set('is_public', String(isPublic));
    formData.set('remove_image', String(removeImage));
    if (newImageFile) {
      formData.set('preview_image', newImageFile);
    }

    const result = await updateComponent(id, formData);
    setIsSaving(false);

    if ('error' in result) {
      toast.error(result.error);
      return;
    }

    toast.success('Component updated');
    router.refresh();
    onClose();
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-bg rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading font-bold text-ink text-lg">Edit component</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface text-ink-3 hover:text-ink transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
            <p className="text-xs text-ink-3 mt-1">{name.length} / 60</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Description <span className="text-ink-3 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={3}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
            />
            <p className="text-xs text-ink-3 mt-1">{description.length} / 200</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Tags <span className="text-ink-3 font-normal">(optional, comma-separated, max 5)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="hero, dark, minimal"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>

          {/* Preview image */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Preview image <span className="text-ink-3 font-normal">(optional, JPEG/PNG, max 2 MB)</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg border border-border bg-surface flex items-center justify-center overflow-hidden flex-shrink-0">
                {previewImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewImageUrl} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-ink-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3h18M3 21h18" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-medium text-accent hover:text-accent-h transition-colors"
                >
                  {previewImageUrl ? 'Change image' : 'Upload image'}
                </button>
                {(previewImageUrl || initialImageUrl) && !removeImage && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-sm text-ink-3 hover:text-red-500 transition-colors text-left"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="text-sm font-medium text-ink">Public</p>
              <p className="text-xs text-ink-3">Visible on Browse and via share link</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${isPublic ? 'bg-accent' : 'bg-border'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isPublic ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-ink-2 hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-h text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `rtk npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
rtk git add components/EditComponentModal.tsx
rtk git commit -m "feat: EditComponentModal — edit name, description, category, tags, image, visibility"
```

---

## Task 3: `ComponentRow` Redesign

**Files:**
- Modify: `components/ComponentRow.tsx`

### What changes

- Replace emoji buttons with proper SVG icon buttons
- Desktop: bigger hit area (`px-2.5 py-1.5` + icon `w-4 h-4`), CSS tooltip on hover
- Delete button: far right, separated by a divider, `text-red-500 hover:bg-red-50 hover:text-red-600`
- Edit button (pencil icon) → opens `EditComponentModal`
- Mobile (< 640px): hide individual buttons, show 3-dot kebab dropdown with all actions listed
- `useRef` + `useEffect` for click-outside close of dropdown

- [ ] **Step 1: Replace ComponentRow with the full redesign**

```typescript
// components/ComponentRow.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { deleteComponent } from '@/app/actions/deleteComponent';
import { togglePublic } from '@/app/actions/togglePublic';
import { copyToWebflow } from '@/libs/copyToWebflow';
import EditComponentModal from '@/components/EditComponentModal';

interface ComponentRowProps {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  imageUrl: string | null;
  isPublic: boolean;
  copyCount: number;
  signedJsonUrl: string;
  description?: string | null;
  tags?: string[];
}

/** Inline tooltip wrapper — shows label above child on hover */
function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-ink rounded-md whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-20">
        {label}
      </span>
    </div>
  );
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
  description = null,
  tags = [],
}: ComponentRowProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cachedJson, setCachedJson] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!signedJsonUrl) return;
    fetch(signedJsonUrl)
      .then((r) => r.text())
      .then(setCachedJson)
      .catch(() => {});
  }, [signedJsonUrl]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  async function handleCopyLink() {
    setShowDropdown(false);
    const shareUrl = `${window.location.origin}/c/${slug}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied!');
    } catch {
      toast.error('Failed to copy link.');
    }
  }

  function handleCopyToWebflow() {
    setShowDropdown(false);
    if (!cachedJson) {
      toast.error('Component data not ready. Please try again.');
      return;
    }
    const bridge = document.getElementById('clipboard-bridge') as HTMLTextAreaElement | null;
    if (!bridge) {
      toast.error('Clipboard bridge not found.');
      return;
    }
    const success = copyToWebflow(cachedJson, bridge);
    if (success) {
      toast.success('Copied! Paste in Webflow Designer (Ctrl+V)');
    } else {
      toast.error('Copy failed.');
    }
  }

  async function handleTogglePublic() {
    setShowDropdown(false);
    const next = !isPublic;
    setIsPublic(next);
    try {
      await togglePublic(id, next);
    } catch {
      setIsPublic(!next);
      toast.error('Failed to update visibility.');
    }
  }

  async function handleDelete() {
    setShowDropdown(false);
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await deleteComponent(id);
    } catch {
      toast.error('Failed to delete component.');
      setIsDeleting(false);
    }
  }

  const iconBtn =
    'flex items-center justify-center rounded-lg p-2 text-ink-2 hover:text-ink hover:bg-surface transition-colors';

  return (
    <>
      <div className={`flex items-center gap-4 px-4 py-3 border-b border-border last:border-0 ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
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

        {/* Desktop actions — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-0.5 flex-shrink-0">
          <Tip label="Copy share link">
            <button onClick={handleCopyLink} className={iconBtn} aria-label="Copy share link">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            </button>
          </Tip>

          <Tip label="Copy to Webflow">
            <button onClick={handleCopyToWebflow} className={iconBtn} aria-label="Copy to Webflow">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
              </svg>
            </button>
          </Tip>

          <Tip label={isPublic ? 'Make private' : 'Make public'}>
            <button onClick={handleTogglePublic} className={iconBtn} aria-label={isPublic ? 'Make private' : 'Make public'}>
              {isPublic ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              )}
            </button>
          </Tip>

          <Tip label="View public page">
            <Link href={`/c/${slug}`} target="_blank" className={iconBtn} aria-label="View public page">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </Link>
          </Tip>

          <Tip label="Edit">
            <button onClick={() => setShowEditModal(true)} className={iconBtn} aria-label="Edit component">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </button>
          </Tip>

          {/* Divider */}
          <div className="w-px h-5 bg-border mx-1" />

          <Tip label="Delete">
            <button
              onClick={handleDelete}
              className="flex items-center justify-center rounded-lg p-2 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              aria-label="Delete component"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </Tip>
        </div>

        {/* Mobile kebab — visible only on mobile */}
        <div className="relative sm:hidden flex-shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className="p-2 rounded-lg hover:bg-surface text-ink-2 hover:text-ink transition-colors"
            aria-label="More actions"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-bg rounded-xl border border-border shadow-lg z-30 py-1 overflow-hidden">
              <button onClick={handleCopyLink} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-surface transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4 text-ink-2 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                Copy share link
              </button>
              <button onClick={handleCopyToWebflow} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-surface transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4 text-ink-2 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                </svg>
                Copy to Webflow
              </button>
              <button onClick={handleTogglePublic} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-surface transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4 text-ink-2 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {isPublic ? 'Make private' : 'Make public'}
              </button>
              <Link href={`/c/${slug}`} target="_blank" onClick={() => setShowDropdown(false)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-surface transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4 text-ink-2 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                View public page
              </Link>
              <button onClick={() => { setShowDropdown(false); setShowEditModal(true); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-surface transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4 text-ink-2 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Edit
              </button>
              <div className="border-t border-border my-1" />
              <button onClick={handleDelete} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {showEditModal && (
        <EditComponentModal
          id={id}
          initialName={name}
          initialDescription={description ?? null}
          initialCategory={category}
          initialTags={tags ?? []}
          initialIsPublic={isPublic}
          initialImageUrl={imageUrl}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Update `DashboardPage` to pass `description` and `tags` to `ComponentRow`**

In `app/dashboard/page.tsx`, the select query already fetches these fields — but they're not passed to `ComponentRow`. Add them:

```typescript
// In the select query, add description and tags:
.select('id, name, slug, category, description, tags, image_url, is_public, copy_count, created_at, json_path')

// In the ComponentRow render:
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
  description={c.description}
  tags={c.tags ?? []}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `rtk npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
rtk git add components/ComponentRow.tsx app/dashboard/page.tsx
rtk git commit -m "feat: ComponentRow — SVG buttons, tooltips, red delete, edit button, mobile dropdown"
```

---

## Task 4: README Rewrite

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README with FlowVault presentation**

```markdown
# FlowVault

**Store, share, and copy Webflow components in one click.**

FlowVault is a community marketplace for Webflow components. Copy any element from the Webflow Designer, paste it into FlowVault to save and share it, and let others copy it straight back into their own projects — no export, no JSON wrangling.

---

## Features

- **Upload in one paste** — Copy any element from the Webflow Designer (Ctrl+C), paste it on FlowVault (Ctrl+V). The component JSON is stored securely.
- **Instant sharing** — Every component gets a unique public link (`/c/[slug]`). Anyone can copy it into Webflow with a single click.
- **Personal library** — Manage all your components from your dashboard. Toggle public/private, edit metadata, copy or delete.
- **Browse & discover** — A public marketplace of components shared by the community, filterable by category.
- **Custom profile** — Public profile page with your components, stats, bio, and avatar. Private profile option available.
- **Free plan** — Store up to 10 components for free. Pro plan for unlimited storage (coming soon).

---

## Tech Stack

| | |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Auth** | Supabase Auth (Google OAuth + Magic Link) |
| **Database** | Supabase PostgreSQL |
| **Storage** | Supabase Storage |
| **Styles** | Tailwind CSS |
| **Hosting** | Vercel |
| **Email** | Resend |

---

## Getting Started (local dev)

### Prerequisites

- Node.js 18+
- A Supabase project
- A Vercel account (for deployment)

### 1. Clone and install

```bash
git clone https://github.com/ClementS03/flowvault
cd flowvault
npm install
```

### 2. Set environment variables

Create `.env.local` at the repo root:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=your_resend_key
```

### 3. Set up Supabase

Run the SQL from `CLAUDE.md` (DB Changes section) in your Supabase SQL editor to create the `components`, `copies`, and `profiles` tables.

Create two Storage buckets:
- `components-json` — **private**
- `component-previews` — **public**
- `avatars` — **public**

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Roadmap

| Phase | Status | Description |
|---|---|---|
| **Phase 1 — MVP** | ✅ Done | Auth, upload, storage, share links, copy to Webflow, dashboard |
| **Phase 1b — Profile UX** | ✅ Done | Two-column profile, avatar upload, private profile toggle |
| **Phase 2 — Marketplace** | Planned | Browse, search, filters, trending |
| **Phase 2b — Social Graph** | Planned | Follow/unfollow, saved components, follower counts |
| **Phase 3 — Pro plan** | Planned | Stripe billing, unlimited storage, upgrade flow |
| **Phase 4 — Polish** | Planned | Component previews, collections, creator analytics |

---

## Project Structure

```
app/
  actions/          Server Actions (create, delete, update, togglePublic…)
  browse/           Public marketplace
  c/[slug]/         Public component page
  dashboard/        Authenticated library
  settings/         Profile + avatar + privacy settings
  u/[username]/     Public profile page
  upload/           Paste + form
components/         Shared UI components
libs/               Utilities (copyToWebflow, supabase, slugify…)
docs/
  superpowers/
    specs/          Design specs
    plans/          Implementation plans
```

---

## License

Private repository. All rights reserved.
```

- [ ] **Step 2: Verify file saved correctly**

Run: `rtk git diff README.md | head -20`
Expected: shows the new content replacing ShipFast boilerplate

- [ ] **Step 3: Commit**

```bash
rtk git add README.md
rtk git commit -m "docs: rewrite README for FlowVault"
```
