'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';

export type SetUsernameResult = { ok: true; username: string } | { error: string };

export async function setUsername(username: string): Promise<SetUsernameResult> {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' };

  const slug = username.trim().toLowerCase();

  if (slug.length < 3) return { error: 'Username must be at least 3 characters' };
  if (slug.length > 30) return { error: 'Username must be 30 characters or less' };
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { error: 'Lowercase letters, numbers and hyphens only' };
  }

  // Check availability
  const { data: existing, error: checkError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('username', slug)
    .neq('id', session.user.id)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    return { error: 'Failed to check username availability' };
  }
  if (existing) return { error: 'Username is already taken' };

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ username: slug, updated_at: new Date().toISOString() })
    .eq('id', session.user.id);

  if (updateError) return { error: 'Failed to save username' };

  revalidatePath('/settings');
  revalidatePath(`/u/${slug}`);

  return { ok: true, username: slug };
}
