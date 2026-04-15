'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';

export type DeleteKitResult = { error: string } | { ok: true };

export async function deleteKit(kitId: string): Promise<DeleteKitResult> {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' };

  const userId = session.user.id;

  const { data: kit } = await supabaseAdmin
    .from('kits')
    .select('id, user_id')
    .eq('id', kitId)
    .single();

  if (!kit || kit.user_id !== userId) return { error: 'Unauthorized' };

  // kit_components rows are deleted via CASCADE
  const { error } = await supabaseAdmin.from('kits').delete().eq('id', kitId);
  if (error) return { error: 'Failed to delete kit' };

  revalidatePath('/dashboard');
  revalidatePath('/browse');

  return { ok: true };
}
