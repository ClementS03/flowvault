'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createKit } from '@/app/actions/createKit';

interface ComponentOption {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
}

export default function KitNewPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [components, setComponents] = useState<ComponentOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/signin'); return; }

      const { data } = await supabase
        .from('components')
        .select('id, name, category, image_url')
        .eq('user_id', session.user.id)
        .eq('is_public', true)
        .eq('is_temporary', false)
        .order('created_at', { ascending: false });

      setComponents(data ?? []);
      setIsLoading(false);
    }
    load();
  }, [supabase, router]);

  function toggleComponent(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setSelectedIds((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    setSelectedIds((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!name.trim()) { toast.error('Kit name is required'); return; }
    if (selectedIds.length < 2) { toast.error('Select at least 2 components'); return; }

    setIsSubmitting(true);
    const result = await createKit(name, description || null, isPublic, selectedIds);
    if ('error' in result) {
      toast.error(result.error);
      setIsSubmitting(false);
    } else {
      toast.success('Kit created!');
      router.push(`/kit/${result.slug}`);
    }
  }

  const componentMap = Object.fromEntries(components.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 mx-auto w-full px-[var(--px-site)] py-16" style={{ maxWidth: 'var(--max-width)' }}>
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Link href="/dashboard?tab=kits" className="text-sm text-ink-3 hover:text-ink transition-colors mb-4 inline-block">
              ← My library
            </Link>
            <h1 className="font-heading text-3xl font-bold text-ink mb-1">Create a kit</h1>
            <p className="text-ink-2">Group your public components into a shareable collection.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Kit name <span className="text-ink-3">(required)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="e.g. SaaS Starter Kit"
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Description <span className="text-ink-3">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="What's included in this kit?"
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors resize-none"
              />
            </div>

            {/* Visibility */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">Public kit</p>
                <p className="text-xs text-ink-3">Visible in Browse → Kits</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  isPublic ? 'bg-accent' : 'bg-border'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    isPublic ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Component selector */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Components <span className="text-ink-3">(select 2–20 public components)</span>
              </label>

              {isLoading ? (
                <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-ink-3">
                  Loading your components…
                </div>
              ) : components.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface p-8 text-center">
                  <p className="text-sm text-ink-2 mb-3">You have no public components yet.</p>
                  <Link href="/upload" className="text-sm text-accent hover:text-accent-h font-medium">
                    Upload a component →
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-white overflow-hidden divide-y divide-border">
                  {components.map((c) => {
                    const selected = selectedIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          selected ? 'bg-accent-bg' : 'hover:bg-surface'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleComponent(c.id)}
                          className="rounded border-border text-accent focus:ring-accent"
                        />
                        {c.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.image_url} alt={c.name} className="w-10 h-7 rounded object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-10 h-7 rounded border border-border bg-accent-bg shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink line-clamp-1">{c.name}</p>
                          {c.category && <p className="text-xs text-ink-3 capitalize">{c.category}</p>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Order preview */}
            {selectedIds.length > 0 && (
              <div>
                <p className="text-sm font-medium text-ink mb-2">Order in kit</p>
                <div className="rounded-xl border border-border bg-white overflow-hidden divide-y divide-border">
                  {selectedIds.map((id, index) => {
                    const c = componentMap[id];
                    if (!c) return null;
                    return (
                      <div key={id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-5 text-xs font-medium text-ink-3 text-center shrink-0">{index + 1}</span>
                        <p className="flex-1 text-sm text-ink line-clamp-1">{c.name}</p>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            className="p-1 rounded text-ink-3 hover:text-ink disabled:opacity-30 transition-colors"
                            aria-label="Move up"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDown(index)}
                            disabled={index === selectedIds.length - 1}
                            className="p-1 rounded text-ink-3 hover:text-ink disabled:opacity-30 transition-colors"
                            aria-label="Move down"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || selectedIds.length < 2 || !name.trim()}
              className="w-full rounded-lg bg-accent hover:bg-accent-h disabled:opacity-50 text-white font-medium px-4 py-3 text-sm transition-colors"
            >
              {isSubmitting ? 'Creating…' : 'Create kit'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
