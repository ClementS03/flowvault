import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import Header from '@/components/Header';
import supabaseAdmin from '@/libs/supabaseAdmin';
import ModerationActions from './ModerationActions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);

export default async function AdminPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !ADMIN_EMAILS.includes(session.user.email ?? '')) {
    notFound();
  }

  // Fetch all public components + pending review — ordered so pending appears first
  const { data: components } = await supabaseAdmin
    .from('components')
    .select('id, slug, name, description, category, image_url, copy_count, created_at, user_id, moderation_status, moderation_note, is_public')
    .or('is_public.eq.true,moderation_status.eq.pending_review')
    .eq('is_temporary', false)
    .order('moderation_status', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100);

  const userIds = Array.from(new Set((components ?? []).map((c) => c.user_id).filter(Boolean)));
  const profileMap: Record<string, { username: string | null; email?: string }> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .in('id', userIds);
    for (const p of profiles ?? []) profileMap[p.id] = p;
  }

  const pending = (components ?? []).filter((c) => c.moderation_status === 'pending_review');
  const live = (components ?? []).filter((c) => c.is_public && c.moderation_status !== 'pending_review');

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 mx-auto w-full px-[var(--px-site)] py-16" style={{ maxWidth: 'var(--max-width)' }}>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-ink mb-1">Admin — Moderation</h1>
            <p className="text-ink-2 text-sm">{live.length} public · {pending.length} pending review</p>
          </div>
        </div>

        {/* Pending review */}
        {pending.length > 0 && (
          <section className="mb-10">
            <h2 className="font-heading font-semibold text-lg text-ink mb-4 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">{pending.length}</span>
              Pending review
            </h2>
            <ComponentTable components={pending} profileMap={profileMap} />
          </section>
        )}

        {/* Live */}
        <section>
          <h2 className="font-heading font-semibold text-lg text-ink mb-4">Public components</h2>
          <ComponentTable components={live} profileMap={profileMap} />
        </section>

      </main>
    </div>
  );
}

function ComponentTable({ components, profileMap }: {
  components: {
    id: string; slug: string; name: string; description: string | null;
    category: string | null; image_url: string | null; copy_count: number;
    created_at: string; user_id: string | null; moderation_status: string | null;
    moderation_note: string | null; is_public: boolean;
  }[];
  profileMap: Record<string, { username: string | null }>;
}) {
  if (components.length === 0) {
    return <p className="text-sm text-ink-3">None.</p>;
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wider">Component</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">Author</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden md:table-cell">Category</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden md:table-cell">Copies</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wider">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {components.map((c) => {
            const profile = c.user_id ? profileMap[c.user_id] : null;
            return (
              <tr key={c.id} className="bg-bg hover:bg-surface transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {c.image_url ? (
                      <Image src={c.image_url} alt={c.name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover border border-border shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-accent-bg border border-border shrink-0" />
                    )}
                    <div className="min-w-0">
                      <Link href={`/c/${c.slug}`} target="_blank" className="font-medium text-ink hover:text-accent transition-colors line-clamp-1">
                        {c.name}
                      </Link>
                      {c.moderation_status === 'pending_review' && c.moderation_note && (
                        <p className="text-xs text-amber-600 mt-0.5 line-clamp-1">Previously rejected: {c.moderation_note}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  {profile?.username ? (
                    <Link href={`/u/${profile.username}`} target="_blank" className="text-ink-2 hover:text-accent transition-colors">
                      @{profile.username}
                    </Link>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-ink-2 capitalize">{c.category ?? '—'}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-ink-2">{c.copy_count}</td>
                <td className="px-4 py-3 text-right">
                  <ModerationActions
                    componentId={c.id}
                    componentName={c.name}
                    status={c.moderation_status}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
