'use client';

import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createComponent } from '@/app/actions/createComponent';
import { setUsername } from '@/app/actions/setUsername';
import UpgradeModal from '@/components/UpgradeModal';

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

type Step = 'loading' | 'set-username' | 'form';

export default function UploadSlideOver({ json, onClose }: Props) {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [step, setStep] = useState<Step>('loading');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Username step state
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSaving, setUsernameSaving] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setIsLoggedIn(false);
        setStep('form');
        return;
      }
      setIsLoggedIn(true);
      // Check if user has a username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();

      if (profile?.username) {
        setStep('form');
      } else {
        setStep('set-username');
      }
    });
  }, [supabase]);

  // Revoke blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  async function handleSetUsername(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (usernameSaving) return;
    setUsernameError('');
    setUsernameSaving(true);

    const result = await setUsername(usernameInput);
    if ('error' in result) {
      setUsernameError(result.error);
      setUsernameSaving(false);
    } else {
      toast.success(`Welcome, @${result.username}!`);
      setStep('form');
    }
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set('is_public', String(isPublic));

      // Validate tags max-5 client-side (server also enforces this)
      const tagsRaw = (formData.get('tags') as string) || '';
      const tagCount = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean).length;
      if (tagCount > 5) {
        toast.error('Maximum 5 tags allowed');
        setIsSubmitting(false);
        return;
      }

      const { slug } = await createComponent(formData, json);
      if (isLoggedIn) {
        // Copy share link to clipboard silently, then go to library
        try {
          await navigator.clipboard.writeText(`${window.location.origin}/c/${slug}`);
          toast.success('Component published! Share link copied.');
        } catch {
          toast.success('Component published!');
        }
        router.push('/dashboard');
      } else {
        router.push(`/upload/result?slug=${slug}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      if (message === 'FREE_LIMIT_REACHED') {
        setShowUpgradeModal(true);
      } else {
        toast.error(message);
      }
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
            {step === 'set-username' ? 'Choose your username' : 'Configure your component'}
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

        {/* Loading */}
        {step === 'loading' && (
          <div className="flex-1 flex items-center justify-center">
            <svg className="w-6 h-6 animate-spin text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {/* Username step */}
        {step === 'set-username' && (
          <form onSubmit={handleSetUsername} className="flex-1 px-6 py-8 flex flex-col gap-6">
            <div className="rounded-xl bg-accent-bg border border-accent/20 px-4 py-3.5 flex gap-3 items-start">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-accent shrink-0 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-ink">Set a username to publish</p>
                <p className="text-xs text-ink-2 mt-0.5">
                  Your username identifies you in the community and appears on your public components.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ink mb-1.5">
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 text-sm select-none">@</span>
                <input
                  id="username"
                  type="text"
                  required
                  autoFocus
                  minLength={3}
                  maxLength={30}
                  placeholder="your-username"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    setUsernameError('');
                  }}
                  className="w-full rounded-lg border border-border bg-bg pl-8 pr-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
                />
              </div>
              {usernameError ? (
                <p className="mt-1.5 text-xs text-red-500">{usernameError}</p>
              ) : (
                <p className="mt-1.5 text-xs text-ink-3">
                  Lowercase letters, numbers and hyphens only · 3–30 characters
                </p>
              )}
              {usernameInput && !usernameError && (
                <p className="mt-1 text-xs text-ink-3">
                  Your profile: <span className="text-accent">flowvault.io/u/{usernameInput.toLowerCase()}</span>
                </p>
              )}
            </div>

            <div className="mt-auto">
              <button
                type="submit"
                disabled={usernameSaving || usernameInput.length < 3}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-3 text-sm transition-colors disabled:opacity-60"
              >
                {usernameSaving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving…
                  </>
                ) : 'Continue'}
              </button>
            </div>
          </form>
        )}

        {/* Main form */}
        {step === 'form' && (
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
                    type="password"
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
        )}
      </div>
      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </>
  );
}
