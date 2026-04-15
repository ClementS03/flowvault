import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ComponentRow from '@/components/ComponentRow';
import supabaseAdmin from '@/libs/supabaseAdmin';
import UpgradeBanner from '@/components/UpgradeBanner';
import KitDeleteButton from './KitDeleteButton';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { tab?: string };
}

export default async function DashboardPage({ searchParams }: Props) {
  const activeTab = searchParams.tab === 'kits' ? 'kits' : 'components';
  // Session is already verified by layout.tsx — safe to assume it exists
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/signin');
  const userId = session.user.id;

  // Parallel fetch: components + profile + kits
  const [{ data: components }, { data: profile }, { data: kits }] = await Promise.all([
    supabaseAdmin
      .from('components')
      .select('id, name, slug, category, description, tags, image_url, is_public, copy_count, created_at, json_path, moderation_status, moderation_note')
      .eq('user_id', userId)
      .eq('is_temporary', false)
      .order('created_at', { ascending: false }),

    supabaseAdmin
      .from('profiles')
      .select('plan, component_count, username')
      .eq('id', userId)
      .single(),

    supabaseAdmin
      .from('kits')
      .select('id, name, slug, description, is_public, copy_count, created_at, kit_components(component_id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  // Generate signed URLs for each component (1h TTL)
  const signedUrls: Record<string, string> = {};
  if (components && components.length > 0) {
    await Promise.all(
      components.map(async (c) => {
        const { data } = await supabaseAdmin.storage
          .from('components-json')
          .createSignedUrl(c.json_path, 3600);
        if (data?.signedUrl) signedUrls[c.id] = data.signedUrl;
      })
    );
  }

  const plan = profile?.plan ?? 'free';
  const componentCount = profile?.component_count ?? 0;
  const isFree = plan === 'free';
  const progressPercent = isFree ? Math.min((componentCount / 10) * 100, 100) : 100;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 mx-auto w-full px-[var(--px-site)] py-16" style={{ maxWidth: 'var(--max-width)' }}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-3xl font-bold text-ink">My library</h1>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-2 text-sm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Upload component
          </Link>
        </div>

        {/* Username banner — no username set */}
        {!profile?.username && (
          <div className="mb-8 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-600 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <p className="text-sm font-medium text-amber-900">
                Your profile is incomplete — set a username to be discoverable on FlowVault.
              </p>
            </div>
            <Link
              href="/onboarding"
              className="shrink-0 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 text-sm transition-colors"
            >
              Set username →
            </Link>
          </div>
        )}

        {/* Upgrade banner — free users at 8+ components */}
        {profile?.plan === 'free' && (profile?.component_count ?? 0) >= 8 && (
          <div className="mb-8">
            <UpgradeBanner count={profile.component_count} />
          </div>
        )}

        {/* Plan progress bar — free users only */}
        {isFree && (
          <div className="flex items-center gap-4 mb-8 p-4 rounded-xl bg-surface border border-border">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-ink-2">
                  <span className="font-medium text-ink">{componentCount}</span> / 10 components · Free plan
                </span>
                <Link href="/pricing" className="text-sm text-accent hover:text-accent-h font-medium transition-colors">
                  Upgrade →
                </Link>
              </div>
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {!isFree && (
          <div className="mb-8 p-3 rounded-xl bg-accent-bg border border-accent/20">
            <span className="text-sm font-medium text-accent">Pro · Unlimited components</span>
          </div>
        )}

        {/* Tab nav */}
        <div className="flex gap-2 mb-6">
          <Link
            href="/dashboard"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'components'
                ? 'bg-ink text-white'
                : 'bg-surface border border-border text-ink-2 hover:border-accent/40 hover:text-ink'
            }`}
          >
            Components
          </Link>
          <Link
            href="/dashboard?tab=kits"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'kits'
                ? 'bg-ink text-white'
                : 'bg-surface border border-border text-ink-2 hover:border-accent/40 hover:text-ink'
            }`}
          >
            Kits
          </Link>
        </div>

        {activeTab === 'kits' ? (
          /* Kits tab */
          <div>
            <div className="flex justify-end mb-4">
              <Link
                href="/kit/new"
                className="inline-flex items-center gap-2 rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-2 text-sm transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New kit
              </Link>
            </div>

            {kits && kits.length > 0 ? (
              <div className="rounded-xl border border-border bg-white divide-y divide-border">
                {kits.map((kit) => {
                  const componentCount = (kit.kit_components as { component_id: string }[] | null)?.length ?? 0;
                  return (
                    <div key={kit.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Link href={`/kit/${kit.slug}`} className="font-medium text-sm text-ink hover:text-accent transition-colors line-clamp-1">
                            {kit.name}
                          </Link>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${kit.is_public ? 'bg-accent-bg text-accent' : 'bg-surface text-ink-3 border border-border'}`}>
                            {kit.is_public ? 'Public' : 'Private'}
                          </span>
                        </div>
                        <p className="text-xs text-ink-3">
                          {componentCount} component{componentCount !== 1 ? 's' : ''} · {kit.copy_count} cop{kit.copy_count === 1 ? 'y' : 'ies'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/kit/${kit.slug}/edit`}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-2 hover:text-ink hover:border-accent/40 transition-colors"
                        >
                          Edit
                        </Link>
                        <KitDeleteButton kitId={kit.id} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface p-16 text-center">
                <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-accent">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
                  </svg>
                </div>
                <p className="font-medium text-ink mb-1">No kits yet</p>
                <p className="text-sm text-ink-3 mb-6">Group your public components into shareable kits.</p>
                <Link href="/kit/new" className="inline-flex items-center rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-2 text-sm transition-colors">
                  Create your first kit
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* Components tab */
          components && components.length > 0 ? (
            <div className="rounded-xl border border-border bg-white">
              {components.map((c) => (
                <ComponentRow
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  slug={c.slug}
                  category={c.category}
                  imageUrl={c.image_url}
                  isPublic={c.is_public}
                  copyCount={c.copy_count}
                  signedJsonUrl={signedUrls[c.id] ?? ''}
                  description={c.description}
                  tags={c.tags ?? []}
                  moderationStatus={c.moderation_status ?? null}
                  moderationNote={c.moderation_note ?? null}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface p-16 text-center">
              <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-accent">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
                </svg>
              </div>
              <p className="font-medium text-ink mb-1">No components yet</p>
              <p className="text-sm text-ink-3 mb-6">Upload your first Webflow component to get started</p>
              <Link
                href="/upload"
                className="inline-flex items-center rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-2 text-sm transition-colors"
              >
                Upload component
              </Link>
            </div>
          )
        )}
      </main>
      <Footer />
    </div>
  );
}
