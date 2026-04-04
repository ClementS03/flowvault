'use client';

import Link from 'next/link';

interface Props {
  onClose: () => void;
}

export default function UpgradeModal({ onClose }: Props) {
  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-bg border border-border shadow-2xl p-8 flex flex-col items-center text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-accent-bg flex items-center justify-center mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-accent">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h2 id="upgrade-title" className="font-heading font-bold text-xl text-ink mb-2">
          You&apos;ve reached the free limit
        </h2>
        <p className="text-sm text-ink-2 leading-relaxed mb-6">
          Free accounts can store up to <strong>10 components</strong>. Upgrade to Pro for unlimited storage and sharing.
        </p>
        <div className="w-full rounded-xl bg-surface border border-border px-4 py-3 mb-6 text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="font-heading font-semibold text-ink">Pro</span>
            <span className="text-lg font-bold text-ink">$9<span className="text-sm font-normal text-ink-3">/mo</span></span>
          </div>
          <ul className="space-y-1.5">
            {['Unlimited components', 'Public & private sharing', 'Priority support'].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-ink-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-accent shrink-0">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <Link
          href="/pricing"
          className="w-full flex items-center justify-center rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-3 text-sm transition-colors mb-3"
        >
          Upgrade to Pro
        </Link>
        <button type="button" onClick={onClose} className="text-sm text-ink-3 hover:text-ink transition-colors">
          Maybe later
        </button>
      </div>
    </>
  );
}
