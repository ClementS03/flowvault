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
    .select('id, display_name, username, bio, website, avatar_url, is_private, created_at')
    .eq('username', username)
    .single();

  if (!profile) notFound();

  const displayName = profile.display_name || profile.username || 'Anonymous';
  const initials = displayName.charAt(0).toUpperCase();

  const avatarEl = (size: 'sm' | 'lg') => {
    const cls = size === 'lg'
      ? 'w-20 h-20 rounded-full object-cover'
      : 'w-16 h-16 rounded-full object-cover';
    const initCls = size === 'lg'
      ? 'w-20 h-20 rounded-full bg-accent-bg flex items-center justify-center text-accent font-heading font-bold text-2xl'
      : 'w-16 h-16 rounded-full bg-accent-bg flex items-center justify-center text-accent font-heading font-bold text-xl';

    return profile.avatar_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt={displayName}
        className={cls}
        referrerPolicy="no-referrer"
      />
    ) : (
      <div className={initCls}>{initials}</div>
    );
  };

  // Private profile gate
  if (profile.is_private) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center px-[var(--px-site)]">
          <div className="text-center">
            <div className="mx-auto mb-4">{avatarEl('lg')}</div>
            <h1 className="font-heading text-xl font-bold text-ink mb-1">{displayName}</h1>
            <p className="text-sm text-ink-3 mb-6">@{profile.username}</p>
            <div className="inline-flex items-center gap-2 bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-ink-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ink-3">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
              </svg>
              This profile is private
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { data: components } = await supabaseAdmin
    .from('components')
    .select('id, name, slug, category, image_url, copy_count, created_at')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .eq('is_temporary', false)
    .order('created_at', { ascending: false });

  const totalCopies = (components ?? []).reduce((sum, c) => sum + (c.copy_count ?? 0), 0);

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main
        className="flex-1 mx-auto w-full px-[var(--px-site)] py-12"
        style={{ maxWidth: 'var(--max-width)' }}
      >
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Sidebar */}
          <aside className="w-full md:w-56 flex-shrink-0 flex flex-col gap-4">
            {/* Profile card */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1">
                <div className="mb-3">{avatarEl('sm')}</div>
                <h1 className="font-heading font-bold text-ink text-base leading-tight">
                  {displayName}
                </h1>
                <p className="text-sm text-ink-3">@{profile.username}</p>
                {profile.bio && (
                  <p className="text-sm text-ink-2 mt-2 leading-relaxed">{profile.bio}</p>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:text-accent-h transition-colors mt-1 break-all"
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>

            {/* Stats card */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-2">Components</span>
                  <span className="text-sm font-semibold text-ink">
                    {(components ?? []).length}
                  </span>
                </div>
                <div className="border-t border-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-2">Total copies</span>
                  <span className="text-sm font-semibold text-ink">{totalCopies}</span>
                </div>
                <div className="border-t border-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-2">Member since</span>
                  <span className="text-sm font-semibold text-ink">{memberSince}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-ink-3 uppercase tracking-wide mb-4">
              Public components
            </p>
            {components && components.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <p className="text-sm text-ink-3">
                  This user hasn&apos;t shared any components yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
