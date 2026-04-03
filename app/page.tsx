import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function LandingPage() {
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

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
              Upload yours
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-surface border-y border-border">
          <div className="mx-auto px-[var(--px-site)] py-20" style={{ maxWidth: "var(--max-width)" }}>
            <h2 className="font-heading text-3xl font-bold text-ink text-center mb-12">
              How it works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Copy from Webflow",
                  description: "Select any element in the Webflow Designer and press Ctrl+C.",
                },
                {
                  step: "2",
                  title: "Paste into FlowVault",
                  description: "Open the upload page and paste (Ctrl+V). Add a name and publish.",
                },
                {
                  step: "3",
                  title: "Share & reuse",
                  description: "Share the link. Anyone can copy the component straight into their Webflow project.",
                },
              ].map((item) => (
                <div key={item.step} className="flex flex-col gap-3 p-6 rounded-xl bg-bg border border-border">
                  <div className="w-8 h-8 rounded-full bg-accent-bg text-accent text-sm font-bold font-heading flex items-center justify-center">
                    {item.step}
                  </div>
                  <h3 className="font-heading font-semibold text-ink">{item.title}</h3>
                  <p className="text-sm text-ink-2">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
