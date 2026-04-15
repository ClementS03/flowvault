import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CopyToWebflowButton from '@/components/CopyToWebflowButton';
import supabaseAdmin from '@/libs/supabaseAdmin';

interface Props {
  params: { slug: string };
}

export const dynamic = 'force-dynamic';

export default async function KitPage({ params }: Props) {
  const { slug } = params;

  const { data: kit } = await supabaseAdmin
    .from('kits')
    .select('id, name, description, slug, is_public, copy_count, user_id, created_at')
    .eq('slug', slug)
    .single();

  if (!kit) notFound();

  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  const isLoggedIn = !!session;

  if (!kit.is_public) {
    if (session?.user?.id !== kit.user_id) notFound();
  }

  const { data: kitComponents } = await supabaseAdmin
    .from('kit_components')
    .select('position, component_id')
    .eq('kit_id', kit.id)
    .order('position', { ascending: true });

  const componentIds = (kitComponents ?? []).map((kc) => kc.component_id);

  const [componentsResult, profileResult] = await Promise.all([
    componentIds.length > 0
      ? supabaseAdmin
          .from('components')
          .select('id, name, description, category, slug, is_public, json_path, image_url, copy_count')
          .in('id', componentIds)
      : Promise.resolve({ data: [] as { id: string; name: string; description: string | null; category: string | null; slug: string; is_public: boolean; json_path: string; image_url: string | null; copy_count: number }[] }),
    supabaseAdmin
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', kit.user_id)
      .single(),
  ]);

  const componentsRaw = componentsResult.data ?? [];
  const componentMap = Object.fromEntries(componentsRaw.map((c) => [c.id, c]));
  const components = componentIds.map((id) => componentMap[id]).filter(Boolean);

  const signedUrls: Record<string, string> = {};
  await Promise.all(
    components
      .filter((c) => c.is_public && c.json_path)
      .map(async (c) => {
        const { data } = await supabaseAdmin.storage
          .from('components-json')
          .createSignedUrl(c.json_path, 3600);
        if (data?.signedUrl) signedUrls[c.id] = data.signedUrl;
      })
  );

  const profile = profileResult.data;
  const displayName = profile?.display_name || profile?.username || 'Anonymous';
  const username = profile?.username || null;

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main
        className="flex-1 mx-auto w-full px-[var(--px-site)] py-16"
        style={{ maxWidth: 'var(--max-width)' }}
      >
        {/* Kit header */}
        <div className="mb-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full bg-accent-bg px-2.5 py-0.5 text-xs font-medium text-accent">
                  Kit · {components.length} component{components.length !== 1 ? 's' : ''}
                </span>
                {kit.copy_count > 0 && (
                  <span className="text-xs text-ink-3">
                    {kit.copy_count} cop{kit.copy_count === 1 ? 'y' : 'ies'}
                  </span>
                )}
              </div>
              <h1 className="font-heading text-3xl font-bold text-ink mb-2">{kit.name}</h1>
              {kit.description && (
                <p className="text-ink-2 max-w-2xl">{kit.description}</p>
              )}
            </div>

            {username ? (
              <Link
                href={`/u/${username}`}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 hover:border-accent/40 transition-colors"
              >
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={displayName}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-accent-bg flex items-center justify-center text-accent text-sm font-semibold">
                    {displayName[0]?.toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="text-sm font-medium text-ink">{displayName}</p>
                  <p className="text-xs text-ink-3">@{username}</p>
                </div>
              </Link>
            ) : null}
          </div>
        </div>

        {/* Components list */}
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          {components.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-ink-2">No components in this kit.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {components.map((c, index) => {
                const isAvailable = c.is_public && !!signedUrls[c.id];
                return (
                  <div
                    key={c.id}
                    className={`flex items-center gap-4 px-5 py-4 ${!isAvailable ? 'opacity-50' : ''}`}
                  >
                    <span className="w-6 text-sm font-medium text-ink-3 shrink-0 text-center">
                      {index + 1}
                    </span>

                    {c.image_url ? (
                      <Image
                        src={c.image_url}
                        alt={c.name}
                        width={56}
                        height={40}
                        className="w-14 h-10 rounded object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-10 rounded border border-border bg-accent-bg shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/c/${c.slug}`}
                        className="font-medium text-sm text-ink hover:text-accent transition-colors line-clamp-1"
                      >
                        {c.name}
                      </Link>
                      {c.category && (
                        <span className="text-xs text-ink-3 capitalize">{c.category}</span>
                      )}
                    </div>

                    {!isAvailable ? (
                      <span className="text-xs text-ink-3 shrink-0">Unavailable</span>
                    ) : (
                      <CopyToWebflowButton
                        signedJsonUrl={signedUrls[c.id]}
                        componentId={c.id}
                        isLoggedIn={isLoggedIn}
                        kitId={kit.id}
                        compact
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/browse?tab=kits" className="text-sm text-ink-3 hover:text-ink transition-colors">
            ← Browse more kits
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
