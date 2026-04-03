import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function BrowsePage() {
  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 mx-auto w-full px-[var(--px-site)] py-16" style={{ maxWidth: "var(--max-width)" }}>
        <div className="mb-10">
          <h1 className="font-heading text-3xl font-bold text-ink mb-2">Browse components</h1>
          <p className="text-ink-2">Discover and copy Webflow components from the community</p>
        </div>

        {/* Empty state */}
        <div className="rounded-xl border border-border bg-surface p-16 text-center">
          <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-accent">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="font-medium text-ink mb-1">No components yet</p>
          <p className="text-sm text-ink-3">Be the first to share a Webflow component</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
