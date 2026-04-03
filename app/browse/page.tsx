import { Suspense } from 'react';
import Link from 'next/link';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import supabaseAdmin from '@/libs/supabaseAdmin';
import BrowseFilters from './BrowseFilters';

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { category?: string; tag?: string };
}

export default async function BrowsePage({ searchParams }: Props) {
  const category = searchParams.category?.trim() || null;
  const tag = searchParams.tag?.trim() || null;

  let list: {
    id: string; slug: string; name: string; description: string | null;
    category: string | null; tags: string[] | null; image_url: string | null;
    copy_count: number; created_at: string; user_id: string | null;
  }[] = [];
  const profileMap: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};

  try {
    // 1. Fetch matching public components
    let query = supabaseAdmin
      .from('components')
      .select('id, slug, name, description, category, tags, image_url, copy_count, created_at, user_id')
      .eq('is_public', true)
      .eq('is_temporary', false)
      .order('copy_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60);

    if (category) query = query.eq('category', category);
    if (tag) query = query.contains('tags', [tag]);

    const { data: components, error: componentsError } = await query;
    if (componentsError) console.error('[browse] components query error:', componentsError.message);
    list = components ?? [];

    // 2. Fetch profiles for the authors
    const userIds = Array.from(new Set(list.map((c) => c.user_id).filter(Boolean)));
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);
      if (profilesError) console.error('[browse] profiles query error:', profilesError.message);
      for (const p of profiles ?? []) {
        profileMap[p.id] = p;
      }
    }
  } catch (err) {
    console.error('[browse] unexpected error:', err);
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 mx-auto w-full px-[var(--px-site)] py-16" style={{ maxWidth: "var(--max-width)" }}>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-ink mb-2">Browse components</h1>
          <p className="text-ink-2">Discover and copy Webflow components from the community</p>
        </div>

        {/* Filters */}
        <Suspense fallback={<div className="h-10" />}>
          <BrowseFilters />
        </Suspense>

        {/* Results count */}
        {(category || tag) && (
          <p className="text-sm text-ink-3 mb-5">
            {list.length} component{list.length !== 1 ? 's' : ''}
            {category ? ` in "${category}"` : ''}
            {tag ? ` tagged "${tag}"` : ''}
          </p>
        )}

        {/* Grid */}
        {list.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-accent">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <p className="font-medium text-ink mb-1">No components found</p>
            <p className="text-sm text-ink-3">
              {category || tag ? 'Try adjusting your filters' : 'Be the first to share a Webflow component'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.map((c) => {
              const profile = c.user_id ? profileMap[c.user_id] : null;
              const displayName = profile?.display_name || profile?.username || 'Anonymous';
              const username = profile?.username || null;

              return (
                <div key={c.id} className="group rounded-xl border border-border bg-surface hover:border-accent/40 hover:shadow-sm transition-all flex flex-col overflow-hidden">

                  {/* Preview image */}
                  <Link href={`/c/${c.slug}`} className="block">
                    {c.image_url ? (
                      <div className="w-full h-44 overflow-hidden bg-bg border-b border-border">
                        <img
                          src={c.image_url}
                          alt={c.name}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-44 bg-accent-bg border-b border-border flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 text-accent/30">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3.75 3h16.5M21 3.75v13.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V3.75" />
                        </svg>
                      </div>
                    )}
                  </Link>

                  {/* Card body */}
                  <div className="flex flex-col gap-3 p-4 flex-1">

                    {/* Category + name */}
                    <div>
                      {c.category && (
                        <span className="inline-block rounded-full bg-accent-bg px-2 py-0.5 text-xs font-medium text-accent capitalize mb-1.5">
                          {c.category}
                        </span>
                      )}
                      <Link href={`/c/${c.slug}`} className="block font-semibold text-ink text-sm leading-snug hover:text-accent transition-colors line-clamp-1">
                        {c.name}
                      </Link>
                      {c.description && (
                        <p className="mt-1 text-xs text-ink-2 line-clamp-2 leading-relaxed">{c.description}</p>
                      )}
                    </div>

                    {/* Tags */}
                    {c.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 4).map((tag: string) => (
                          <span key={tag} className="rounded bg-bg border border-border px-1.5 py-0.5 text-xs text-ink-3">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer: author + copies */}
                    <div className="mt-auto pt-3 border-t border-border flex items-center justify-between gap-2">
                      {username ? (
                        <Link
                          href={`/u/${username}`}
                          className="flex items-center gap-1.5 min-w-0 group/author"
                        >
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={displayName}
                              className="w-5 h-5 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-accent-bg flex items-center justify-center text-accent text-xs font-semibold shrink-0">
                              {displayName[0]?.toUpperCase()}
                            </span>
                          )}
                          <span className="text-xs text-ink-3 group-hover/author:text-accent transition-colors truncate">
                            @{username}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xs text-ink-3">Anonymous</span>
                      )}

                      <div className="flex items-center gap-1 text-xs text-ink-3 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                        </svg>
                        {c.copy_count > 0 ? `${c.copy_count} cop${c.copy_count === 1 ? 'y' : 'ies'}` : 'New'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
