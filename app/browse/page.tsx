import Link from 'next/link';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import supabaseAdmin from '@/libs/supabaseAdmin';

export const dynamic = "force-dynamic";

export default async function BrowsePage() {
  const { data: components } = await supabaseAdmin
    .from('components')
    .select('id, slug, name, description, category, tags, image_url, copy_count, created_at')
    .eq('is_public', true)
    .eq('is_temporary', false)
    .order('created_at', { ascending: false })
    .limit(60);

  const list = components ?? [];

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 mx-auto w-full px-[var(--px-site)] py-16" style={{ maxWidth: "var(--max-width)" }}>
        <div className="mb-10">
          <h1 className="font-heading text-3xl font-bold text-ink mb-2">Browse components</h1>
          <p className="text-ink-2">Discover and copy Webflow components from the community</p>
        </div>

        {list.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-accent">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <p className="font-medium text-ink mb-1">No components yet</p>
            <p className="text-sm text-ink-3">Be the first to share a Webflow component</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className="group rounded-xl border border-border bg-surface hover:border-accent/40 hover:shadow-sm transition-all flex flex-col overflow-hidden"
              >
                {/* Preview image */}
                {c.image_url ? (
                  <div className="w-full h-40 overflow-hidden bg-bg border-b border-border">
                    <img
                      src={c.image_url}
                      alt={c.name}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="w-full h-40 bg-accent-bg border-b border-border flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 text-accent/40">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3.75 3h16.5M21 3.75v13.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V3.75" />
                    </svg>
                  </div>
                )}

                {/* Info */}
                <div className="flex flex-col gap-2 p-4 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-ink text-sm leading-snug line-clamp-1">{c.name}</p>
                    {c.category && (
                      <span className="shrink-0 rounded-full bg-accent-bg px-2 py-0.5 text-xs font-medium text-accent capitalize">
                        {c.category}
                      </span>
                    )}
                  </div>

                  {c.description && (
                    <p className="text-xs text-ink-2 line-clamp-2 leading-relaxed">{c.description}</p>
                  )}

                  {c.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-auto pt-1">
                      {c.tags.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="rounded bg-bg border border-border px-1.5 py-0.5 text-xs text-ink-3">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                    <span className="text-xs text-ink-3">
                      {c.copy_count > 0 ? `${c.copy_count} ${c.copy_count === 1 ? 'copy' : 'copies'}` : 'New'}
                    </span>
                    <span className="text-xs font-medium text-accent group-hover:underline">Copy →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
