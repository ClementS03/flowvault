'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { slugify } from '@/libs/slugify';
import supabaseAdmin from '@/libs/supabaseAdmin';

export type CreateKitResult = { error: string } | { slug: string };

export async function createKit(
  name: string,
  description: string | null,
  isPublic: boolean,
  componentIds: string[]
): Promise<CreateKitResult> {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' };

  const userId = session.user.id;

  const trimmedName = name.trim();
  if (!trimmedName) return { error: 'Kit name is required' };
  if (trimmedName.length > 60) return { error: 'Kit name must be 60 characters or less' };
  if (componentIds.length < 2) return { error: 'A kit must contain at least 2 components' };
  if (componentIds.length > 20) return { error: 'A kit can contain at most 20 components' };

  // Verify all components exist, are public, and belong to this user
  const { data: components } = await supabaseAdmin
    .from('components')
    .select('id, is_public, user_id')
    .in('id', componentIds);

  if (!components || components.length !== componentIds.length) {
    return { error: 'One or more components not found' };
  }
  for (const c of components) {
    if (c.user_id !== userId) return { error: 'You can only add your own components to a kit' };
    if (!c.is_public) return { error: 'All components in a kit must be public' };
  }

  const kitId = crypto.randomUUID();
  const slug = slugify(trimmedName);

  const { error: kitError } = await supabaseAdmin.from('kits').insert({
    id: kitId,
    user_id: userId,
    name: trimmedName,
    description: description?.trim() || null,
    slug,
    is_public: isPublic,
    copy_count: 0,
  });

  if (kitError) return { error: 'Failed to create kit' };

  const pivotRows = componentIds.map((cid, index) => ({
    kit_id: kitId,
    component_id: cid,
    position: index,
  }));

  const { error: pivotError } = await supabaseAdmin
    .from('kit_components')
    .insert(pivotRows);

  if (pivotError) {
    await supabaseAdmin.from('kits').delete().eq('id', kitId);
    return { error: 'Failed to save kit components' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/browse');

  return { slug };
}
