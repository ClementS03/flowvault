import { notFound } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CopyToWebflowButton from '@/components/CopyToWebflowButton';
import CopyLinkButton from '@/components/CopyLinkButton';
import PasswordGate from './PasswordGate';
import supabaseAdmin from '@/libs/supabaseAdmin';

interface Props {
  params: { slug: string };
  searchParams?: { ref?: string };
}

export const dynamic = 'force-dynamic';

export default async function ComponentPage({ params, searchParams }: Props) {
  const { slug } = params;
  const fromBrowse = searchParams?.ref === 'browse';

  const { data: component } = await supabaseAdmin
    .from('components')
    .select('id, name, description, category, tags, image_url, copy_count, json_path, is_public, is_temporary, expires_at, user_id, password_hash')
    .eq('slug', slug)
    .single();

  if (!component) notFound();

  // Don't serve expired temp components
  if (component.is_temporary && component.expires_at && new Date(component.expires_at) < new Date()) {
    notFound();
  }

  // Access control for private components
  if (!component.is_public) {
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    const isOwner = session?.user?.id === component.user_id;

    if (!isOwner) {
      if (component.password_hash) {
        const unlockCookie = cookies().get(`unlock_${component.id}`);
        if (!unlockCookie) {
          return <PasswordGate componentId={component.id} componentName={component.name} />;
        }
      } else {
        notFound();
      }
    }
  }

  // Fetch author profile + their other public components in parallel
  const [signedResult, profileResult, moreResult] = await Promise.all([
    supabaseAdmin.storage.from('components-json').createSignedUrl(component.json_path, 3600),
    component.user_id
      ? supabaseAdmin.from('profiles').select('username, display_name, avatar_url').eq('id', component.user_id).single()
      : Promise.resolve({ data: null }),
    component.user_id
      ? supabaseAdmin
          .from('components')
          .select('id, slug, name, image_url, category, copy_count')
          .eq('user_id', component.user_id)
          .eq('is_public', true)
          .eq('is_temporary', false)
          .neq('id', component.id)
          .order('copy_count', { ascending: false })
          .limit(3)
      : Promise.resolve({ data: null }),
  ]);

  if (!signedResult.data?.signedUrl) {
    console.error(`[c/slug] Failed to generate signed URL for component ${component.id}`);
  }

  const profile = profileResult.data;
  const moreComponents: { id: string; slug: string; name: string; image_url: string | null; category: string | null; copy_count: number }[] = moreResult.data ?? [];
  const displayName = profile?.display_name || profile?.username || null;

  const supabaseUser = createServerComponentClient({ cookies });
  const { data: { session: userSession } } = await supabaseUser.auth.getSession();
  // Public components can be copied by anyone with the direct share link.
  // If the user arrived from /browse (?ref=browse), require login to copy.
  // Only private components always require login.
  const isLoggedIn = (component.is_public && !fromBrowse) || !!userSession;

  const host = headers().get('host') ?? '';
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`}/c/${slug}`;

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 px-[var(--px-site)] py-16">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {component.category && (
                <span className="inline-flex items-center rounded-full bg-accent-bg px-2.5 py-0.5 text-xs font-medium text-accent capitalize">
                  {component.category}
                </span>
              )}
            </div>
            <h1 className="font-heading text-3xl font-bold text-ink mb-2">{component.name}</h1>
            {component.description && (
              <p className="text-ink-2">{component.description}</p>
            )}
            {component.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {component.tags.map((tag: string) => (
                  <span key={tag} className="rounded-md bg-surface border border-border px-2 py-0.5 text-xs text-ink-2">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Author */}
            {displayName && profile?.username && (
              <div className="mt-4 flex items-center gap-2">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt={displayName} width={24} height={24} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-accent-bg flex items-center justify-center text-accent text-xs font-semibold">
                    {displayName[0].toUpperCase()}
                  </span>
                )}
                <span className="text-sm text-ink-2">by{' '}
                  <Link href={`/u/${profile.username}`} className="font-medium text-ink hover:text-accent transition-colors">
                    @{profile.username}
                  </Link>
                </span>
              </div>
            )}
          </div>

          {/* Preview image */}
          {component.image_url && (
            <div className="mb-8 rounded-xl overflow-hidden border border-border">
              <Image src={component.image_url} alt={component.name} width={800} height={450} className="w-full object-cover" />
            </div>
          )}

          {/* Action card */}
          <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Ready to use in Webflow Designer</p>
              {component.copy_count > 0 && (
                <span className="text-xs text-ink-3">{component.copy_count} {component.copy_count === 1 ? 'copy' : 'copies'}</span>
              )}
            </div>

            <CopyToWebflowButton
              componentId={component.id}
              signedJsonUrl={signedResult.data?.signedUrl ?? null}
              isLoggedIn={isLoggedIn}
            />

            <div>
              <p className="text-xs font-medium text-ink-3 uppercase tracking-widest mb-2">Share link</p>
              <CopyLinkButton url={shareUrl} />
            </div>

            {component.is_temporary && (
              <p className="text-xs text-ink-3 text-center">
                Expires in ~24h · <a href="/signin" className="underline hover:text-ink-2">Sign in</a> to store permanently
              </p>
            )}
          </div>

          {/* More from this author */}
          {moreComponents.length > 0 && profile?.username && (
            <div className="mt-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-semibold text-ink">
                  More from @{profile.username}
                </h2>
                <Link href={`/u/${profile.username}`} className="text-xs text-ink-3 hover:text-accent transition-colors">
                  See all →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {moreComponents.map((c) => (
                  <Link
                    key={c.id}
                    href={`/c/${c.slug}`}
                    className="group rounded-lg border border-border bg-surface hover:border-accent/40 hover:shadow-sm transition-all overflow-hidden flex flex-col"
                  >
                    {c.image_url ? (
                      <div className="relative w-full h-24 overflow-hidden border-b border-border">
                        <Image src={c.image_url} alt={c.name} fill className="object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="w-full h-24 bg-accent-bg border-b border-border flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-7 h-7 text-accent/30">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3.75 3h16.5M21 3.75v13.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V3.75" />
                        </svg>
                      </div>
                    )}
                    <div className="p-3 flex flex-col gap-1 flex-1">
                      <p className="text-xs font-medium text-ink line-clamp-1">{c.name}</p>
                      <div className="flex items-center justify-between mt-auto">
                        {c.category && (
                          <span className="text-xs text-accent capitalize">{c.category}</span>
                        )}
                        {c.copy_count > 0 && (
                          <span className="text-xs text-ink-3">{c.copy_count} cop{c.copy_count === 1 ? 'y' : 'ies'}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}
