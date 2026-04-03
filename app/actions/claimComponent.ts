'use server';

import supabaseAdmin from '@/libs/supabaseAdmin';

/**
 * Associate a temporary (anonymous) component with a newly authenticated user.
 * Called from the auth callback route when a slug query param is present.
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
  if (!component.is_temporary) return;  // Already claimed — skip
  if (component.user_id !== null) return; // Belongs to someone else — skip

  // Move JSON from anonymous/ to userId/
  let newJsonPath = component.json_path;
  if (component.json_path.startsWith('anonymous/')) {
    newJsonPath = `${userId}/${component.id}.json`;
    await supabaseAdmin.storage
      .from('components-json')
      .move(component.json_path, newJsonPath);
  }

  // Claim the component
  await supabaseAdmin
    .from('components')
    .update({
      user_id: userId,
      is_temporary: false,
      expires_at: null,
      json_path: newJsonPath,
    })
    .eq('id', component.id);

  // Update component count
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('component_count')
    .eq('id', userId)
    .single();

  await supabaseAdmin
    .from('profiles')
    .update({ component_count: (profile?.component_count ?? 0) + 1 })
    .eq('id', userId);
}
