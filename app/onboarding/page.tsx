'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { setUsername } from '@/app/actions/setUsername';

export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsernameValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (username.length < 3) {
      setAvailability('idle');
      return;
    }

    setAvailability('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`);
        const { available } = await res.json();
        setAvailability(available ? 'available' : 'taken');
      } catch {
        setAvailability('idle');
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (availability === 'taken') return;
    setError('');
    setLoading(true);

    const result = await setUsername(username);

    if ('error' in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-heading font-bold text-2xl text-ink">
            <span className="text-accent">Flow</span>Vault
          </span>
          <p className="mt-2 text-sm text-ink-3">One last step before you start</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-8">
          <h1 className="font-heading font-bold text-xl text-ink mb-1">Choose your username</h1>
          <p className="text-sm text-ink-3 mb-6">
            This is your public handle on FlowVault. You can change it later in settings.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <div className={`flex items-center rounded-lg border bg-bg overflow-hidden transition-colors focus-within:ring-2 focus-within:ring-accent/20 ${
                availability === 'taken' ? 'border-red-400 focus-within:border-red-400' :
                availability === 'available' ? 'border-green-400 focus-within:border-green-400' :
                'border-border focus-within:border-accent'
              }`}>
                <span className="pl-3 text-ink-3 text-sm select-none">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setError('');
                    setUsernameValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                  }}
                  placeholder="your-username"
                  autoFocus
                  className="flex-1 bg-transparent px-2 py-3 text-sm text-ink placeholder:text-ink-3 outline-none"
                  maxLength={30}
                />
                {/* Availability indicator */}
                <div className="pr-3">
                  {availability === 'checking' && (
                    <svg className="w-4 h-4 animate-spin text-ink-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {availability === 'available' && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  )}
                  {availability === 'taken' && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  )}
                </div>
              </div>
              <p className={`mt-1.5 text-xs ${
                availability === 'taken' ? 'text-red-500' :
                availability === 'available' ? 'text-green-600' :
                'text-ink-3'
              }`}>
                {availability === 'taken' ? 'This username is already taken' :
                 availability === 'available' ? 'Username is available!' :
                 'Lowercase letters, numbers and hyphens only'}
              </p>
              {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || username.length < 3 || availability === 'taken' || availability === 'checking'}
              className="w-full flex items-center justify-center rounded-lg bg-accent hover:bg-accent-h disabled:opacity-50 text-white font-medium px-4 py-3 text-sm transition-colors"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                'Continue to dashboard →'
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
