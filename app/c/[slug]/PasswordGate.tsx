'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { verifyComponentPassword } from '@/app/actions/verifyComponentPassword';

interface Props {
  componentId: string;
  componentName: string;
}

export default function PasswordGate({ componentId, componentName }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    const result = await verifyComponentPassword(componentId, password);
    if ('ok' in result) {
      router.refresh();
    } else {
      setError('Incorrect password');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-accent">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="font-heading text-xl font-bold text-ink mb-1">Password required</h1>
          <p className="text-sm text-ink-2">
            <span className="font-medium">{componentName}</span> is protected. Enter the password to access it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
            />
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-2.5 text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Verifying…' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}
