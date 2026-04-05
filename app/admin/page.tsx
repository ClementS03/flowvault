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

interface Props {
  searchParams?: { filter?: string; q?: string };
}

type Component = {
  id: string; slug: string; name: string; description: string | null;
  category: string | null; image_url: string | null; copy_count: number;
  created_at: string; user_id: string | null; moderation_status: string | null;
  moderation_note: string | null; is_public: boolean;
};

export default async function AdminPage({ searchParams }: Props) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !ADMIN_EMAILS.includes(session.user.email ?? '')) {
    notFound();
  }

  const adminUserId = session.user.id;
  const filter = searchParams?.filter ?? 'all'; // 'all' | 'pending' | 'mine'
  const q = searchParams?.q?.trim() || null;

  const SELECT = 'id, slug, name, description, category, image_url, copy_count, created_at, user_id, moderation_status, moderation_note, is_public';

  // Two focused queries — pending (all users) + mine (admin's own public)
  const [pendingResult, mineResult] = await Promise.all([
    (filter === 'mine') ? Promise.resolve({ data: [] as Component[] }) : (async () => {
      let q2 = supabaseAdmin
        .from('components')
        .select(SELECT)
        .eq('moderation_status', 'pending_review')
        .eq('is_temporary', false)
        .order('created_at', { ascending: false });
      if (q) q2 = q2.ilike('name', `%${q}%`);
      const { data } = await q2;
      return { data: (data ?? []) as Component[] };
    })(),

    (filter === 'pending') ? Promise.resolve({ data: [] as Component[] }) : (async () => {
      let q2 = supabaseAdmin
        .from('components')
        .select(SELECT)
        .eq('user_id', adminUserId)
        .eq('is_temporary', false)
        .order('created_at', { ascending: false });
      if (q) q2 = q2.ilike('name', `%${q}%`);
      const { data } = await q2;
      return { data: (data ?? []) as Component[] };
    })(),
  ]);

  // Merge + deduplicate (admin's pending component can appear in both)
  const seen = new Set<string>();
  const components: Component[] = [
    ...pendingResult.data,
    ...mineResult.data,
  ].filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  // Fetch author profiles
  const userIds = Array.from(new Set(components.map((c) => c.user_id).filter(Boolean)));
  const profileMap: Record<string, { username: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .in('id', userIds);
    for (const p of profiles ?? []) profileMap[p.id] = p;
  }

  const pending = components.filter((c) => c.moderation_status === 'pending_review');
  const live = components.filter((c) => c.moderation_status !== 'pending_review');

  const tabs = [
    { key: 'all', label: 'All', count: pending.length + live.length },
    { key: 'pending', label: 'Pending review', count: pendingResult.data.length },
    { key: 'mine', label: 'My components', count: mineResult.data.length },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 mx-auto w-full px-[var(--px-site)] py-16" style={{ maxWidth: 'var(--max-width)' }}>

        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-ink mb-1">Admin — Moderation</h1>
          <p className="text-ink-2 text-sm">{pending.length} pending · {live.length} public</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={`/admin?filter=${tab.key}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  filter === tab.key
                    ? 'bg-bg text-ink shadow-sm border border-border'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                {tab.label}
                <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                  filter === tab.key ? 'bg-accent text-white' : 'bg-border text-ink-3'
                }`}>
                  {tab.count}
                </span>
              </Link>
            ))}
          </div>

          {/* Search */}
          <form method="get" action="/admin" className="flex-1 flex items-center gap-2 max-w-xs">
            <input type="hidden" name="filter" value={filter} />
            <input
              name="q"
              defaultValue={q ?? ''}
              placeholder="Search by name…"
              className="w-full border border-border rounded-lg px-3 py-1.5 text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
            {q && (
              <Link href={`/admin?filter=${filter}`} className="text-xs text-ink-3 hover:text-ink whitespace-nowrap">
                Clear
              </Link>
            )}
          </form>
        </div>

        {/* Pending review */}
        {(filter === 'all' || filter === 'pending') && pending.length > 0 && (
          <section className="mb-10">
            <h2 className="font-heading font-semibold text-lg text-ink mb-4 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">{pending.length}</span>
              Pending review
            </h2>
            <ComponentTable components={pending} profileMap={profileMap} />
          </section>
        )}

        {/* Mine */}
        {(filter === 'all' || filter === 'mine') && (
          <section>
            <h2 className="font-heading font-semibold text-lg text-ink mb-4">My components</h2>
            <ComponentTable components={live} profileMap={profileMap} />
          </section>
        )}

        {components.length === 0 && (
          <p className="text-sm text-ink-3 mt-8">No components match your filters.</p>
        )}

      </main>
    </div>
  );
}

function ComponentTable({ components, profileMap }: {
  components: Component[];
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
            <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden md:table-cell">Status</th>
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
                        <p className="text-xs text-amber-600 mt-0.5 line-clamp-2">Previously rejected: {c.moderation_note}</p>
                      )}
                      {c.moderation_status === 'rejected' && c.moderation_note && (
                        <p className="text-xs text-red-500 mt-0.5 line-clamp-2">Reason: {c.moderation_note}</p>
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
                <td className="px-4 py-3 hidden md:table-cell">
                  {c.is_public ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Public</span>
                  ) : c.moderation_status === 'rejected' ? (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Rejected</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-surface border border-border px-2 py-0.5 text-xs font-medium text-ink-3">Private</span>
                  )}
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
