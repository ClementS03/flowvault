'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import supabaseAdmin from '@/libs/supabaseAdmin';

export async function deleteAccount(): Promise<void> {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Unauthorized');

  const userId = session.user.id;

  const { data: components } = await supabaseAdmin
    .from('components')
    .select('id, json_path')
    .eq('user_id', userId);

  if (components && components.length > 0) {
    const jsonPaths = components.map((c) => c.json_path).filter(Boolean);
    if (jsonPaths.length > 0) {
      await supabaseAdmin.storage.from('components-json').remove(jsonPaths);
    }
    const imagePaths = components.flatMap((c) => [`${c.id}.jpg`, `${c.id}.png`]);
    await supabaseAdmin.storage.from('component-previews').remove(imagePaths);
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('avatar_url')
    .eq('id', userId)
    .single();

  if (profile?.avatar_url) {
    const match = profile.avatar_url.match(/avatars\/(.+)$/);
    if (match) {
      await supabaseAdmin.storage.from('avatars').remove([match[1]]);
    }
  }

  await supabaseAdmin.from('copies').delete().eq('user_id', userId);
  await supabaseAdmin.from('components').delete().eq('user_id', userId);
  await supabaseAdmin.from('profiles').delete().eq('id', userId);

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) {
    console.error('[deleteAccount] Failed to delete auth user:', authError.message);
    throw new Error('Failed to delete account. Please contact support.');
  }

  await supabase.auth.signOut();
  redirect('/');
}
