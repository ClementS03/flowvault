import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import supabaseAdmin from "@/libs/supabaseAdmin";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  // Fetch a few live stats for social proof
  let componentCount = 0;
  let copyCount = 0;
  try {
    const [compResult, copyResult] = await Promise.all([
      supabaseAdmin.from("components").select("*", { count: "exact", head: true }).eq("is_public", true).eq("is_temporary", false),
      supabaseAdmin.from("copies").select("*", { count: "exact", head: true }),
    ]);
    if (compResult.error) console.error("[home] components count error:", compResult.error.message);
    if (copyResult.error) console.error("[home] copies count error:", copyResult.error.message);
    componentCount = compResult.count ?? 0;
    copyCount = copyResult.count ?? 0;
  } catch (err) {
    console.error("[home] stats error:", err);
  }

  const stats = [
    { value: componentCount, label: "components shared" },
    { value: copyCount, label: "copies made" },
  ];

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="mx-auto px-[var(--px-site)] py-24 text-center" style={{ maxWidth: "var(--max-width)" }}>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-bg px-4 py-1.5 text-sm font-medium text-accent mb-6">
            Webflow component marketplace
          </div>

          <h1 className="font-heading text-5xl font-bold text-ink leading-tight mb-6 max-w-3xl mx-auto">
            Share Webflow components<br />
            <span className="text-accent">in one click</span>
          </h1>

          <p className="text-lg text-ink-2 mb-10 max-w-xl mx-auto">
            Copy a component from the Webflow Designer, paste it into FlowVault,
            share the link. Anyone can copy it straight back into their project.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link
              href="/browse"
              className="inline-flex items-center justify-center rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-6 py-3 text-sm transition-colors"
            >
              Browse components
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-bg text-ink font-medium px-6 py-3 text-sm transition-colors"
            >
              Share yours
            </Link>
          </div>

          {/* Live stats */}
          {(componentCount ?? 0) > 0 && (
            <div className="flex items-center justify-center gap-8 sm:gap-12">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <p className="font-heading text-2xl font-bold text-ink">{s.value.toLocaleString()}</p>
                  <p className="text-xs text-ink-3 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* How it works */}
        <section className="bg-surface border-y border-border">
          <div className="mx-auto px-[var(--px-site)] py-20" style={{ maxWidth: "var(--max-width)" }}>
            <h2 className="font-heading text-3xl font-bold text-ink text-center mb-3">
              How it works
            </h2>
            <p className="text-ink-2 text-center mb-12 max-w-md mx-auto">
              No plugins, no exports. Just copy, paste, and share.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <div key={item.step} className="flex flex-col gap-4 p-6 rounded-xl bg-bg border border-border">
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

        {/* Bottom CTA */}
        <section className="mx-auto px-[var(--px-site)] py-20 text-center" style={{ maxWidth: "var(--max-width)" }}>
          <h2 className="font-heading text-2xl font-bold text-ink mb-3">
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
