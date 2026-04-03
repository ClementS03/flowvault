import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ComponentRow from '@/components/ComponentRow';
import supabaseAdmin from '@/libs/supabaseAdmin';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Session is already verified by layout.tsx — safe to assume it exists
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/signin');
  const userId = session.user.id;

  // Parallel fetch: components + profile
  const [{ data: components }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from('components')
      .select('id, name, slug, category, description, tags, image_url, is_public, copy_count, created_at, json_path')
      .eq('user_id', userId)
      .eq('is_temporary', false)
      .order('created_at', { ascending: false }),

    supabaseAdmin
      .from('profiles')
      .select('plan, component_count')
      .eq('id', userId)
      .single(),
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

        {/* Component list or empty state */}
        {components && components.length > 0 ? (
          <div className="rounded-xl border border-border bg-white overflow-hidden">
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
        )}
      </main>
      <Footer />
    </div>
  );
}
