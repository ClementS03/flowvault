import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import supabaseAdmin from '@/libs/supabaseAdmin';
import ResultSignInPanel from '@/components/ResultSignInPanel';
import CopyLinkButton from '@/components/CopyLinkButton';
import CopyToWebflowButton from '@/components/CopyToWebflowButton';

interface Props {
  searchParams: { slug?: string };
}

export const dynamic = 'force-dynamic';

export default async function ResultPage({ searchParams }: Props) {
  const { slug } = searchParams;
  if (!slug) notFound();

  // Use admin client so signed URL works regardless of auth state
  const { data: component } = await supabaseAdmin
    .from('components')
    .select('id, name, description, category, image_url, is_temporary, expires_at, json_path, is_public')
    .eq('slug', slug)
    .single();

  if (!component) notFound();

  // Signed URL via admin so it works for anonymous (no session) visitors
  const { data: signedData } = await supabaseAdmin.storage
    .from('components-json')
    .createSignedUrl(component.json_path, 3600); // 1 hour

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/c/${slug}`;

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 flex items-center justify-center px-[var(--px-site)] py-16">
        <div className="w-full max-w-4xl mx-auto">
          {/* Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-4 py-1.5 text-sm font-medium text-green-700 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Your component is ready
            </div>
            <h1 className="font-heading text-3xl font-bold text-ink">
              {component.name}
            </h1>
            {component.description && (
              <p className="mt-2 text-ink-2">{component.description}</p>
            )}
          </div>

          {/* Two-column layout */}
          <div className="flex flex-col lg:flex-row items-stretch gap-0">
            {/* Component card */}
            <div className="flex-1 rounded-2xl lg:rounded-r-none border border-border bg-surface p-8 flex flex-col gap-6">
              {/* Preview image */}
              <div className="w-full aspect-video rounded-lg bg-bg border border-border overflow-hidden flex items-center justify-center">
                {component.image_url ? (
                  <img
                    src={component.image_url}
                    alt={component.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-ink-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3.75 3h16.5M21 3.75v13.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V3.75" />
                    </svg>
                    <span className="text-xs">No preview</span>
                  </div>
                )}
              </div>

              {/* Category badge */}
              {component.category && (
                <span className="self-start inline-flex items-center rounded-full bg-accent-bg px-2.5 py-0.5 text-xs font-medium text-accent capitalize">
                  {component.category}
                </span>
              )}

              {/* Share link */}
              <div>
                <p className="text-xs font-medium text-ink-3 uppercase tracking-widest mb-2">Share link</p>
                <CopyLinkButton url={shareUrl} />
              </div>

              {/* Copy to Webflow */}
              <CopyToWebflowButton
                componentId={component.id}
                signedJsonUrl={signedData?.signedUrl ?? null}
              />

              {/* Expiry notice */}
              {component.is_temporary && (
                <p className="text-xs text-ink-3 text-center">
                  This link expires in ~24h. Sign in to store it permanently.
                </p>
              )}
            </div>

            {/* OR divider */}
            <div className="hidden lg:flex flex-col items-center justify-center px-6 relative">
              <div className="w-px flex-1 bg-border" />
              <div className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-semibold text-ink-3 my-3 shrink-0">
                OR
              </div>
              <div className="w-px flex-1 bg-border" />
            </div>

            {/* Mobile OR divider */}
            <div className="flex lg:hidden items-center gap-4 py-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-semibold text-ink-3">OR</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Sign-in panel */}
            <div className="flex-1 rounded-2xl lg:rounded-l-none border border-border lg:border-l-0 bg-bg p-8">
              <ResultSignInPanel slug={slug} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
