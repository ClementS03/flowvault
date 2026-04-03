'use server';

import supabaseAdmin from '@/libs/supabaseAdmin';

/**
 * Associate a temporary (anonymous) component with a newly authenticated user.
 * Called from the auth callback route when a slug query param is present.
 * Never throws — all error paths return early to avoid breaking the auth callback.
 */
export async function claimComponent(
  slug: string,
  userId: string
): Promise<void> {
  // Fetch the temp component
  const { data: component, error: fetchError } = await supabaseAdmin
    .from('components')
    .select('id, json_path, is_temporary, user_id')
    .eq('slug', slug)
    .single();

  if (fetchError || !component) return; // Component not found — silently skip
  if (!component.is_temporary) return;  // Not a temp component — nothing to claim
  if (component.user_id !== null) return; // Belongs to someone else — skip

  // Move JSON from anonymous/ to userId/
  let newJsonPath = component.json_path;
  if (component.json_path.startsWith('anonymous/')) {
    newJsonPath = `${userId}/${component.id}.json`;
    const { error: moveError } = await supabaseAdmin.storage
      .from('components-json')
      .move(component.json_path, newJsonPath);

    if (moveError) return; // File move failed — abort to keep storage + DB in sync
  }

  // Atomically claim the component: only succeeds if still temporary and unclaimed
  const { data: claimed } = await supabaseAdmin
    .from('components')
    .update({
      user_id: userId,
      is_temporary: false,
      expires_at: null,
      json_path: newJsonPath,
    })
    .eq('id', component.id)
    .eq('is_temporary', true)
    .is('user_id', null)
    .select('id')
    .single();

  if (!claimed) return; // Component was already claimed in a concurrent request

  // Update component count
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('component_count')
    .eq('id', userId)
    .single();

  if (!profile) return; // Profile not found — skip count update

  await supabaseAdmin
    .from('profiles')
    .update({ component_count: (profile.component_count ?? 0) + 1 })
    .eq('id', userId);
}
