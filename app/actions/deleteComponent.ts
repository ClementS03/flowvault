// app/actions/deleteComponent.ts
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

  // 2. Delete Storage files in parallel (JSON + preview image — try both .jpg and .png)
  await Promise.all([
    supabaseAdmin.storage.from('components-json').remove([component.json_path]),
    supabaseAdmin.storage.from('component-previews').remove([`${id}.jpg`]),
    supabaseAdmin.storage.from('component-previews').remove([`${id}.png`]),
  ]);

  // 3. Delete DB row
  await supabaseAdmin.from('components').delete().eq('id', id);

  // 4. Decrement component_count
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('component_count')
    .eq('id', session.user.id)
    .single();

  if (profile && profile.component_count > 0) {
    await supabaseAdmin
      .from('profiles')
      .update({ component_count: profile.component_count - 1 })
      .eq('id', session.user.id);
  }

  // 5. Revalidate
  revalidatePath('/dashboard');
}
