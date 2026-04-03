import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SettingsForm from '@/components/SettingsForm';
import supabaseAdmin from '@/libs/supabaseAdmin';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/signin');

  const userId = session.user.id;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('display_name, username, bio, website, avatar_url, plan')
    .eq('id', userId)
    .single();

  const avatarUrl =
    profile?.avatar_url ||
    (session.user.user_metadata?.avatar_url as string | undefined) ||
    null;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 mx-auto w-full px-[var(--px-site)] py-16" style={{ maxWidth: 'var(--max-width)' }}>
        <h1 className="font-heading text-3xl font-bold text-ink mb-8">Settings</h1>
        <SettingsForm
          userId={userId}
          email={session.user.email ?? ''}
          plan={profile?.plan ?? 'free'}
          initialDisplayName={profile?.display_name ?? ''}
          initialUsername={profile?.username ?? ''}
          initialBio={profile?.bio ?? ''}
          initialWebsite={profile?.website ?? ''}
          avatarUrl={avatarUrl}
        />
      </main>
      <Footer />
    </div>
  );
}
