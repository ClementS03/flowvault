'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';

export async function deleteComponent(id: string): Promise<void> {
  // 1. Verify ownership
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Unauthorized');

  const { data: component } = await supabaseAdmin
    .from('components')
    .select('id, user_id, json_path')
    .eq('id', id)
    .single();

  if (!component || component.user_id !== session.user.id) {
    throw new Error('Unauthorized');
  }

  // 2. Delete DB row first — if this fails, storage is untouched (safe rollback)
  // user_id check is defense-in-depth on top of the ownership check above
  const { error: deleteError } = await supabaseAdmin
    .from('components')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);
  if (deleteError) throw new Error('Failed to delete component');

  // 3. Clean up Storage files (after DB delete so a storage failure doesn't leave a broken component)
  // JSON removal: log on failure (orphaned blob, not critical — no user-visible impact)
  const { error: jsonError } = await supabaseAdmin.storage
    .from('components-json')
    .remove([component.json_path]);
  if (jsonError) {
    console.error('[deleteComponent] Failed to remove JSON from storage:', jsonError.message);
  }
  // Preview image: try both extensions — one will 404, errors are expected and intentionally ignored
  await Promise.all([
    supabaseAdmin.storage.from('component-previews').remove([`${id}.jpg`]),
    supabaseAdmin.storage.from('component-previews').remove([`${id}.png`]),
  ]);

  // 4. Decrement component_count
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('component_count')
    .eq('id', session.user.id)
    .single();

  if (profile && profile.component_count > 0) {
    const { error: decrementError } = await supabaseAdmin
      .from('profiles')
      .update({ component_count: profile.component_count - 1 })
      .eq('id', session.user.id);
    if (decrementError) {
      console.error('[deleteComponent] Failed to decrement component_count:', decrementError.message);
    }
  }

  // 5. Revalidate
  revalidatePath('/dashboard');
}
