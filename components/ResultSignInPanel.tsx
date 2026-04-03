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
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectURL },
      });
    } catch {
      setIsLoading(false);
    }
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
          "Track how many times it's been copied",
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
