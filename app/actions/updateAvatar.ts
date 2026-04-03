'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';

export type UpdateAvatarResult = { error: string } | { ok: true };

export async function updateAvatarUrl(avatarUrl: string | null): Promise<UpdateAvatarResult> {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' };

  // If a URL is provided, verify it belongs to this user's storage folder
  if (avatarUrl !== null) {
    const expectedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${session.user.id}/`;
    if (!avatarUrl.startsWith(expectedPrefix)) {
      return { error: 'Invalid avatar URL' };
    }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      { id: session.user.id, avatar_url: avatarUrl, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );

  if (error) return { error: 'Failed to update avatar' };

  revalidatePath('/settings');
  revalidatePath('/', 'layout');
  return { ok: true };
}
