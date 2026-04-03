'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { copyToWebflow } from '@/libs/copyToWebflow';

interface Props {
  componentId: string;
  signedJsonUrl: string | null;
}

export default function CopyToWebflowButton({ componentId, signedJsonUrl }: Props) {
  const [cachedJson, setCachedJson] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  // Pre-fetch JSON on mount so the click handler can call copyToWebflow()
  // synchronously — document.execCommand('copy') requires a synchronous user gesture.
  useEffect(() => {
    if (!signedJsonUrl) return;
    fetch(signedJsonUrl)
      .then((r) => r.text())
      .then(setCachedJson)
      .catch(() => {}); // silent — button will show error on click if still null
  }, [signedJsonUrl]);

  function handleCopy() {
    if (!cachedJson) {
      toast.error('Component data unavailable. Please refresh the page.');
      return;
    }

    setIsCopying(true);
    try {
      const bridge = document.getElementById('clipboard-bridge') as HTMLTextAreaElement | null;
      if (!bridge) throw new Error('Clipboard bridge not found');

      const success = copyToWebflow(cachedJson, bridge);
      if (success) {
        toast.success('Copied! Paste in Webflow Designer (Ctrl+V)');
        fetch(`/api/components/${componentId}/copy`, { method: 'POST' }).catch(() => {});
      } else {
        toast.error('Copy failed. Try again.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      toast.error(message);
    } finally {
      setIsCopying(false);
    }
  }

  const isReady = !!cachedJson;

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={isCopying || !isReady}
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
      ) : !isReady ? (
        <>
          <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading…
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
