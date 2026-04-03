'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';

export type UpdateProfileResult = { error: string } | { ok: true; username: string };

export async function updateProfile(formData: FormData): Promise<UpdateProfileResult> {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' };

  const userId = session.user.id;

  const displayName = (formData.get('display_name') as string)?.trim() || null;
  const usernameRaw = (formData.get('username') as string)?.trim().toLowerCase() || null;
  const bio = (formData.get('bio') as string)?.trim() || null;
  const website = (formData.get('website') as string)?.trim() || null;

  if (displayName && displayName.length > 50) {
    return { error: 'Display name must be 50 characters or less' };
  }

  if (usernameRaw) {
    if (usernameRaw.length < 3) return { error: 'Username must be at least 3 characters' };
    if (usernameRaw.length > 30) return { error: 'Username must be 30 characters or less' };
    if (!/^[a-z0-9-]+$/.test(usernameRaw)) {
      return { error: 'Username can only contain lowercase letters, numbers, and hyphens' };
    }

    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', usernameRaw)
      .neq('id', userId)
      .single();

    if (existing) return { error: 'Username is already taken' };
  }

  if (bio && bio.length > 160) {
    return { error: 'Bio must be 160 characters or less' };
  }

  if (website) {
    try {
      const url = new URL(website.startsWith('http') ? website : `https://${website}`);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { error: 'Website must be a valid URL' };
      }
    } catch {
      return { error: 'Website must be a valid URL' };
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      display_name: displayName,
      username: usernameRaw,
      bio,
      website: website
        ? website.startsWith('http') ? website : `https://${website}`
        : null,
    })
    .eq('id', userId);

  if (updateError) return { error: 'Failed to save profile' };

  revalidatePath('/settings');
  if (usernameRaw) revalidatePath(`/u/${usernameRaw}`);

  return { ok: true, username: usernameRaw ?? '' };
}
