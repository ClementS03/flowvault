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
