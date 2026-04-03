'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';

export async function togglePublic(id: string, isPublic: boolean): Promise<void> {
  // 1. Verify ownership
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Unauthorized');

  const { data: component } = await supabaseAdmin
    .from('components')
    .select('id, user_id')
    .eq('id', id)
    .single();

  if (!component || component.user_id !== session.user.id) {
    throw new Error('Unauthorized');
  }

  // 2. Update is_public
  const { error } = await supabaseAdmin
    .from('components')
    .update({ is_public: isPublic })
    .eq('id', id);

  if (error) throw new Error('Failed to update visibility');

  // 3. Revalidate
  revalidatePath('/dashboard');
}
