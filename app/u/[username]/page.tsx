import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProfileComponentCard from '@/components/ProfileComponentCard';
import supabaseAdmin from '@/libs/supabaseAdmin';

interface Props {
  params: { username: string };
}

export const dynamic = 'force-dynamic';

export default async function UserProfilePage({ params }: Props) {
  const { username } = params;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, username, bio, website, avatar_url')
    .eq('username', username)
    .single();

  if (!profile) notFound();

  const { data: components } = await supabaseAdmin
    .from('components')
    .select('id, name, slug, category, image_url, copy_count, created_at')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .eq('is_temporary', false)
    .order('created_at', { ascending: false });

  const totalCopies = (components ?? []).reduce((sum, c) => sum + (c.copy_count ?? 0), 0);
  const displayName = profile.display_name || profile.username || 'Anonymous';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 mx-auto w-full px-[var(--px-site)] py-16" style={{ maxWidth: 'var(--max-width)' }}>
        {/* Profile header */}
        <div className="flex items-start gap-6 mb-12">
          <div className="flex-shrink-0">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-20 h-20 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-accent-bg flex items-center justify-center text-accent font-heading font-bold text-2xl">
                {initials}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-2xl font-bold text-ink mb-0.5">{displayName}</h1>
            <p className="text-sm text-ink-3 mb-3">@{profile.username}</p>

            {profile.bio && (
              <p className="text-sm text-ink-2 mb-3 max-w-lg">{profile.bio}</p>
            )}

            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:text-accent-h transition-colors"
              >
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}

            <p className="text-sm text-ink-3 mt-3">
              <span className="font-medium text-ink">{(components ?? []).length}</span> components
              {' · '}
              <span className="font-medium text-ink">{totalCopies}</span> total copies
            </p>
          </div>
        </div>

        {/* Components list */}
        {components && components.length > 0 ? (
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            {components.map((c) => (
              <ProfileComponentCard
                key={c.id}
                name={c.name}
                slug={c.slug}
                category={c.category}
                imageUrl={c.image_url}
                copyCount={c.copy_count}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface p-16 text-center">
            <p className="font-medium text-ink mb-1">No public components yet</p>
            <p className="text-sm text-ink-3">This user hasn't shared any components yet.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
