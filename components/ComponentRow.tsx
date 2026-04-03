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

  function handleCopyLink() {
    const shareUrl = `${window.location.origin}/c/${slug}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied!');
  }

  function handleCopyToWebflow() {
    const bridge = document.getElementById('clipboard-bridge') as HTMLTextAreaElement | null;
    if (!bridge) {
      toast.error('Clipboard bridge not found.');
      return;
    }
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
    setIsPublic(next);
    try {
      await togglePublic(id, next);
    } catch {
      setIsPublic(!next);
      toast.error('Failed to update visibility.');
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await deleteComponent(id);
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
        <button
          onClick={handleCopyLink}
          title="Copy share link"
          className="p-2 rounded-lg hover:bg-surface text-ink-2 hover:text-ink transition-colors text-sm"
        >
          ⎘
        </button>
        <button
          onClick={handleCopyToWebflow}
          title="Copy to Webflow"
          className="p-2 rounded-lg hover:bg-surface text-ink-2 hover:text-ink transition-colors text-sm"
        >
          ⬇
        </button>
        <button
          onClick={handleTogglePublic}
          title={isPublic ? 'Make private' : 'Make public'}
          className="p-2 rounded-lg hover:bg-surface text-ink-2 hover:text-ink transition-colors text-sm"
        >
          👁
        </button>
        <Link
          href={`/c/${slug}`}
          target="_blank"
          title="View public page"
          className="p-2 rounded-lg hover:bg-surface text-ink-2 hover:text-ink transition-colors text-sm"
        >
          →
        </Link>
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
