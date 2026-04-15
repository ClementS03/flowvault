'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';

export type UpdateKitResult = { error: string } | { ok: true };

export async function updateKit(
  kitId: string,
  name: string,
  description: string | null,
  isPublic: boolean,
  componentIds: string[]
): Promise<UpdateKitResult> {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' };

  const userId = session.user.id;

  const { data: kit } = await supabaseAdmin
    .from('kits')
    .select('id, user_id, slug')
    .eq('id', kitId)
    .single();

  if (!kit || kit.user_id !== userId) return { error: 'Unauthorized' };

  const trimmedName = name.trim();
  if (!trimmedName) return { error: 'Kit name is required' };
  if (trimmedName.length > 60) return { error: 'Kit name must be 60 characters or less' };
  if (componentIds.length < 2) return { error: 'A kit must contain at least 2 components' };
  if (componentIds.length > 20) return { error: 'A kit can contain at most 20 components' };

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

  const { error: updateError } = await supabaseAdmin
    .from('kits')
    .update({
      name: trimmedName,
      description: description?.trim() || null,
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    })
    .eq('id', kitId);

  if (updateError) return { error: 'Failed to update kit' };

  await supabaseAdmin.from('kit_components').delete().eq('kit_id', kitId);

  const pivotRows = componentIds.map((cid, index) => ({
    kit_id: kitId,
    component_id: cid,
    position: index,
  }));

  const { error: pivotError } = await supabaseAdmin
    .from('kit_components')
    .insert(pivotRows);

  if (pivotError) return { error: 'Failed to update kit components' };

  revalidatePath(`/kit/${kit.slug}`);
  revalidatePath('/dashboard');
  revalidatePath('/browse');

  return { ok: true };
}
