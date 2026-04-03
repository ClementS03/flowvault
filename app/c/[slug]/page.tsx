import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Props {
  params: { slug: string };
}

export default async function ComponentPage({ params }: Props) {
  const { slug } = params;

  // TODO Phase 1: fetch component from Supabase by slug
  // For now, show a stub so the route exists
  if (!slug) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto px-[var(--px-site)] py-16" style={{ maxWidth: "var(--max-width)" }}>
        <div className="max-w-2xl mx-auto">
          {/* Component header */}
          <div className="mb-8">
            <p className="text-sm text-ink-3 mb-2">Component</p>
            <h1 className="font-heading text-3xl font-bold text-ink mb-3">{slug}</h1>
            <p className="text-ink-2">No description yet.</p>
          </div>

          {/* Copy button */}
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-sm text-ink-3 mb-4">Ready to use in Webflow Designer</p>
            <button
              disabled
              className="inline-flex items-center gap-2 rounded-lg bg-accent text-white font-medium px-6 py-3 text-sm opacity-50 cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
              Copy to Webflow
            </button>
            <p className="text-xs text-ink-3 mt-3">Coming in Phase 1 implementation</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
