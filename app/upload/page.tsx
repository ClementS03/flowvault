import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import config from "@/config";

export default async function UploadPage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect(config.auth.loginUrl);
  }

  return (
    <>
      <Header />
      <main className="mx-auto px-[var(--px-site)] py-16" style={{ maxWidth: "var(--max-width)" }}>
        <div className="max-w-2xl mx-auto">
          <h1 className="font-heading text-3xl font-bold text-ink mb-2">
            Upload a component
          </h1>
          <p className="text-ink-2 mb-10">
            Copy a component in Webflow Designer (Ctrl+C), then paste it below.
          </p>

          {/* Paste zone — functional logic comes in Phase 1 implementation */}
          <div className="rounded-xl border-2 border-dashed border-border bg-surface p-12 text-center cursor-pointer hover:border-accent hover:bg-accent-bg transition-colors">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-accent">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="font-medium text-ink">Paste your Webflow component here</p>
              <p className="text-sm text-ink-3">Press Ctrl+V after copying from Webflow Designer</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
