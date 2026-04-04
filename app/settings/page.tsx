import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import config from '@/config';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SettingsForm from '@/components/SettingsForm';
import supabaseAdmin from '@/libs/supabaseAdmin';
import DeleteAccountButton from '@/components/DeleteAccountButton';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect(config.auth.loginUrl);

  const userId = session.user.id;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('display_name, username, bio, website, avatar_url, plan, is_private')
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
          initialDisplayName={
            profile?.display_name ||
            (session.user.user_metadata?.full_name as string | undefined) ||
            (session.user.user_metadata?.name as string | undefined) ||
            ''
          }
          initialUsername={profile?.username ?? ''}
          initialBio={profile?.bio ?? ''}
          initialWebsite={profile?.website ?? ''}
          avatarUrl={avatarUrl}
          initialIsPrivate={profile?.is_private ?? false}
        />

        {/* Danger zone */}
        <div className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-heading font-semibold text-red-900 mb-1">Danger zone</h2>
          <p className="text-sm text-red-700 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <DeleteAccountButton />
        </div>
      </main>
      <Footer />
    </div>
  );
}
