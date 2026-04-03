'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link. Please copy it manually.');
    }
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
