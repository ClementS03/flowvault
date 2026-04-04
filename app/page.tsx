import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="mx-auto px-[var(--px-site)] py-16 sm:py-24 text-center" style={{ maxWidth: "var(--max-width)" }}>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-bg px-4 py-1.5 text-sm font-medium text-accent mb-6">
            Webflow component marketplace
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-ink leading-tight mb-5 max-w-3xl mx-auto">
            Share Webflow components{' '}
            <span className="text-accent">in one click</span>
          </h1>

          <p className="text-base sm:text-lg text-ink-2 mb-10 max-w-xl mx-auto">
            Copy a component from the Webflow Designer, paste it into FlowVault,
            share the link. Anyone can copy it straight back into their project.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/browse"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-6 py-3 text-sm transition-colors"
            >
              Browse components
            </Link>
            <Link
              href="/upload"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-bg text-ink font-medium px-6 py-3 text-sm transition-colors"
            >
              Share yours
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-surface border-y border-border">
          <div className="mx-auto px-[var(--px-site)] py-16 sm:py-20" style={{ maxWidth: "var(--max-width)" }}>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ink text-center mb-3">
              How it works
            </h2>
            <p className="text-ink-2 text-center mb-10 sm:mb-12 max-w-md mx-auto text-sm sm:text-base">
              No plugins, no exports. Just copy, paste, and share.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  step: "1",
                  title: "Copy from Webflow",
                  description: "Select any element in the Webflow Designer and press Ctrl+C (Cmd+C on Mac).",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                    </svg>
                  ),
                },
                {
                  step: "2",
                  title: "Paste into FlowVault",
                  description: "Open the upload page and press Ctrl+V. Give it a name, add tags, and publish.",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  ),
                },
                {
                  step: "3",
                  title: "Copy into any project",
                  description: "Share the link. Anyone opens it and clicks 'Copy to Webflow' — it's instantly in their clipboard.",
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                    </svg>
                  ),
                },
              ].map((item) => (
                <div key={item.step} className="flex flex-col gap-4 p-5 sm:p-6 rounded-xl bg-bg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-bg text-accent flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <span className="text-xs font-semibold text-ink-3 uppercase tracking-widest">Step {item.step}</span>
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-ink mb-1">{item.title}</h3>
                    <p className="text-sm text-ink-2 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why FlowVault */}
        <section className="mx-auto px-[var(--px-site)] py-16 sm:py-20" style={{ maxWidth: "var(--max-width)" }}>
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ink mb-3">
              Why FlowVault?
            </h2>
            <p className="text-ink-2 max-w-md mx-auto text-sm sm:text-base">
              Everything you need to stop rebuilding the same sections from scratch.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                ),
                title: "One-click copy",
                description: "Click 'Copy to Webflow' and paste directly into the Designer. No exports, no plugins, no friction.",
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                ),
                title: "Share with a link",
                description: "Every component gets a unique URL. Send it to a client, a teammate, or post it on Twitter.",
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                ),
                title: "Your personal library",
                description: "All your components in one place. Public or private. Find them instantly instead of digging through old projects.",
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                ),
                title: "Community marketplace",
                description: "Browse hundreds of components made by the Webflow community. Filter by category, tag, or popularity.",
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                ),
                title: "Public or private",
                description: "Keep your library private, or open it to the world. You control visibility for every component.",
              },
              {
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                ),
                title: "Free to start",
                description: "Store up to 10 components for free, forever. Upgrade to Pro for unlimited storage at €9/month.",
              },
            ].map((feature) => (
              <div key={feature.title} className="flex flex-col gap-3 p-5 sm:p-6 rounded-xl border border-border bg-bg hover:border-accent/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-accent-bg text-accent flex items-center justify-center shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-ink mb-1">{feature.title}</h3>
                  <p className="text-sm text-ink-2 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mx-auto px-[var(--px-site)] py-16 sm:py-20 text-center" style={{ maxWidth: "var(--max-width)" }}>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-ink mb-3">
            Ready to share your first component?
          </h2>
          <p className="text-ink-2 mb-8 max-w-sm mx-auto text-sm">
            It takes 30 seconds. No account required to get a share link.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center justify-center rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-6 py-3 text-sm transition-colors"
          >
            Upload a component
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
