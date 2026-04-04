'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { setUsername } from '@/app/actions/setUsername';

export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsernameValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
              <div className="flex items-center rounded-lg border border-border bg-bg overflow-hidden focus-within:border-accent transition-colors">
                <span className="pl-3 text-ink-3 text-sm select-none">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsernameValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="your-username"
                  autoFocus
                  className="flex-1 bg-transparent px-2 py-3 text-sm text-ink placeholder:text-ink-3 outline-none"
                  maxLength={30}
                />
              </div>
              <p className="mt-1.5 text-xs text-ink-3">Lowercase letters, numbers and hyphens only</p>
              {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || username.length < 3}
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
