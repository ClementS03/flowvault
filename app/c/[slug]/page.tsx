import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CopyToWebflowButton from '@/components/CopyToWebflowButton';
import CopyLinkButton from '@/components/CopyLinkButton';
import supabaseAdmin from '@/libs/supabaseAdmin';

interface Props {
  params: { slug: string };
}

export const dynamic = 'force-dynamic';

export default async function ComponentPage({ params }: Props) {
  const { slug } = params;

  const { data: component } = await supabaseAdmin
    .from('components')
    .select('id, name, description, category, tags, image_url, copy_count, json_path, is_public, is_temporary, expires_at')
    .eq('slug', slug)
    .single();

  if (!component) notFound();

  // Don't serve expired temp components
  if (component.is_temporary && component.expires_at && new Date(component.expires_at) < new Date()) {
    notFound();
  }

  const { data: signedData } = await supabaseAdmin.storage
    .from('components-json')
    .createSignedUrl(component.json_path, 3600);

  if (!signedData?.signedUrl) {
    console.error(`[c/slug] Failed to generate signed URL for component ${component.id}`);
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/c/${slug}`;

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />
      <main className="flex-1 px-[var(--px-site)] py-16">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            {component.category && (
              <span className="inline-flex items-center rounded-full bg-accent-bg px-2.5 py-0.5 text-xs font-medium text-accent capitalize mb-3">
                {component.category}
              </span>
            )}
            <h1 className="font-heading text-3xl font-bold text-ink mb-2">{component.name}</h1>
            {component.description && (
              <p className="text-ink-2">{component.description}</p>
            )}
            {component.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {component.tags.map((tag: string) => (
                  <span key={tag} className="rounded-md bg-surface border border-border px-2 py-0.5 text-xs text-ink-2">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Preview image */}
          {component.image_url && (
            <div className="mb-8 rounded-xl overflow-hidden border border-border">
              <img src={component.image_url} alt={component.name} className="w-full object-cover" />
            </div>
          )}

          {/* Action card */}
          <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Ready to use in Webflow Designer</p>
              {component.copy_count > 0 && (
                <span className="text-xs text-ink-3">{component.copy_count} {component.copy_count === 1 ? 'copy' : 'copies'}</span>
              )}
            </div>

            <CopyToWebflowButton
              componentId={component.id}
              signedJsonUrl={signedData?.signedUrl ?? null}
            />

            <div>
              <p className="text-xs font-medium text-ink-3 uppercase tracking-widest mb-2">Share link</p>
              <CopyLinkButton url={shareUrl} />
            </div>

            {component.is_temporary && (
              <p className="text-xs text-ink-3 text-center">
                Expires in ~24h · <a href="/signin" className="underline hover:text-ink-2">Sign in</a> to store permanently
              </p>
            )}
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
