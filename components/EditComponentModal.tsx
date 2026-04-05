'use client';

import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { updateComponent } from '@/app/actions/updateComponent';

const CATEGORIES = [
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
  const blobUrlRef = useRef<string | null>(null);

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
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
    // Revoke previous blob URL before creating a new one
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }
    const blobUrl = URL.createObjectURL(file);
    blobUrlRef.current = blobUrl;
    setNewImageFile(file);
    setRemoveImage(false);
    setPreviewImageUrl(blobUrl);
  }

  function handleRemoveImage() {
    setRemoveImage(true);
    setNewImageFile(null);
    setPreviewImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Revoke blob URL on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!category) {
      toast.error('Please select a category');
      return;
    }
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

    if (result.pendingReview) {
      toast.success('Component submitted for review — it will go public once approved.');
    } else {
      toast.success('Component updated');
    }
    router.refresh();
    onClose();
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="edit-modal-title" className="w-full max-w-lg bg-bg rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 id="edit-modal-title" className="font-heading font-bold text-ink text-lg">Edit component</h2>
          <button
            onClick={onClose}
            aria-label="Close"
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
            <label className="block text-sm font-medium text-ink mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            >
              <option value="" disabled>Select a category</option>
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
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isPublic ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
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
