import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
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

  const { data: component } = await supabaseAdmin
    .from('components')
    .select('id, name, description, category, image_url, is_temporary, json_path')
    .eq('slug', slug)
    .single();

  if (!component) notFound();

  const { data: signedData } = await supabaseAdmin.storage
    .from('components-json')
    .createSignedUrl(component.json_path, 3600);

  if (!signedData?.signedUrl) {
    console.error(`[result] Failed to generate signed URL for component ${component.id}`);
  }

  const host = headers().get('host') ?? '';
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`}/c/${slug}`;

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 flex items-center justify-center px-[var(--px-site)] py-12">
        <div className="w-full max-w-4xl mx-auto">

          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-4 py-1.5 text-sm font-medium text-green-700">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Your component is ready
            </div>
          </div>

          {/* Two columns */}
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-px bg-border rounded-2xl overflow-hidden shadow-sm">

            {/* Component card */}
            <div className="bg-surface p-8 flex flex-col gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-3 mb-1">Component</p>
                <h1 className="font-heading text-xl font-bold text-ink">{component.name}</h1>
                {component.description && (
                  <p className="mt-1 text-sm text-ink-2">{component.description}</p>
                )}
                {component.category && (
                  <span className="mt-2 inline-flex items-center rounded-full bg-accent-bg px-2.5 py-0.5 text-xs font-medium text-accent capitalize">
                    {component.category}
                  </span>
                )}
              </div>

              {/* Preview image */}
              {component.image_url && (
                <div className="w-full rounded-lg overflow-hidden border border-border">
                  <img src={component.image_url} alt={component.name} className="w-full object-cover" />
                </div>
              )}

              {/* Share link */}
              <div>
                <p className="text-xs font-medium text-ink-3 uppercase tracking-widest mb-2">Share link</p>
                <CopyLinkButton url={shareUrl} />
              </div>

              {/* CTA */}
              <CopyToWebflowButton
                componentId={component.id}
                signedJsonUrl={signedData?.signedUrl ?? null}
              />

              {component.is_temporary && (
                <p className="text-xs text-ink-3 text-center -mt-1">
                  Expires in ~24h · <a href="/signin" className="underline hover:text-ink-2">Sign in</a> to store permanently
                </p>
              )}
            </div>

            {/* OR divider — desktop vertical, mobile horizontal */}
            <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex-col items-center justify-center z-10 pointer-events-none">
              <div className="w-8 h-8 rounded-full bg-bg border border-border flex items-center justify-center text-xs font-semibold text-ink-3 shadow-sm">
                OR
              </div>
            </div>
            <div className="flex lg:hidden items-center gap-4 bg-bg px-8 py-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-semibold text-ink-3">OR</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Sign-in panel */}
            <div className="bg-bg p-8">
              <ResultSignInPanel slug={slug} />
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
