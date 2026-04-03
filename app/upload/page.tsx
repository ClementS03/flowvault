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
