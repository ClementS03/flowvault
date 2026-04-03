'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';

export type UpdatePrivacyResult = { error: string } | { ok: true };

export async function updatePrivacy(isPrivate: boolean): Promise<UpdatePrivacyResult> {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' };

  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      { id: session.user.id, is_private: isPrivate, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );

  if (error) return { error: 'Failed to update privacy setting' };

  revalidatePath('/settings');
  revalidatePath('/', 'layout');
  return { ok: true };
}
