'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';

export type UpdateComponentResult = { error: string } | { ok: true; pendingReview?: boolean };

export async function updateComponent(
  id: string,
  formData: FormData
): Promise<UpdateComponentResult> {
  // 1. Auth
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Unauthorized' };

  // 2. Ownership + fetch current row (need slug + image_url for revalidate + cleanup)
  const { data: component } = await supabaseAdmin
    .from('components')
    .select('id, user_id, slug, image_url, moderation_status')
    .eq('id', id)
    .single();

  if (!component || component.user_id !== session.user.id) {
    return { error: 'Unauthorized' };
  }

  // 3. Parse fields
  const name = ((formData.get('name') as string) ?? '').trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const category = (formData.get('category') as string) || null;
  const tagsRaw = (formData.get('tags') as string) || '';
  const tags = tagsRaw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);
  const isPublic = formData.get('is_public') === 'true';
  const removeImage = formData.get('remove_image') === 'true';
  const imageFile = formData.get('preview_image') as File | null;

  // 4. Validate
  if (!name) return { error: 'Name is required' };
  if (name.length > 60) return { error: 'Name must be 60 characters or less' };
  if (description && description.length > 200) return { error: 'Description must be 200 characters or less' };
  if (isPublic && !category) return { error: 'Category is required to make a component public' };

  // 5. Handle image
  let imageUrl: string | null | undefined = undefined; // undefined = no change

  if (removeImage) {
    // Delete old image from storage if it exists
    if (component.image_url) {
      // Path is "{componentId}.jpg" or "{componentId}.png" in component-previews bucket
      const [{ error: rmJpgError }, { error: rmPngError }] = await Promise.all([
        supabaseAdmin.storage.from('component-previews').remove([`${id}.jpg`]),
        supabaseAdmin.storage.from('component-previews').remove([`${id}.png`]),
      ]);
      if (rmJpgError && !rmJpgError.message.includes('not found')) {
        console.error('[updateComponent] Failed to remove old image (jpg):', rmJpgError.message);
      }
      if (rmPngError && !rmPngError.message.includes('not found')) {
        console.error('[updateComponent] Failed to remove old image (png):', rmPngError.message);
      }
    }
    imageUrl = null;
  } else if (imageFile && imageFile.size > 0) {
    // Validate
    if (!['image/jpeg', 'image/png'].includes(imageFile.type)) {
      return { error: 'Preview image must be a JPEG or PNG file' };
    }
    if (imageFile.size > 2 * 1024 * 1024) {
      return { error: 'Preview image must be under 2MB' };
    }

    const ext = imageFile.type === 'image/png' ? 'png' : 'jpg';
    const imagePath = `${id}.${ext}`;

    const { error: imgError } = await supabaseAdmin.storage
      .from('component-previews')
      .upload(imagePath, imageFile, { contentType: imageFile.type, upsert: true });

    if (imgError) {
      return { error: 'Failed to upload preview image' };
    }

    // Delete old images only after successful upload (avoid orphaning DB reference)
    const otherExt = ext === 'jpg' ? 'png' : 'jpg';
    await supabaseAdmin.storage.from('component-previews').remove([`${id}.${otherExt}`]);

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('component-previews')
      .getPublicUrl(imagePath);
    imageUrl = publicUrl;
  }

  // 6. Build update payload — only include image_url if it changed
  // If the component was previously rejected and the user is trying to re-publish,
  // set moderation_status to 'pending_review' instead of making it directly public.
  // Exception: admins bypass pending_review (they are the reviewers).
  const ADMIN_LIST = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);
  const isAdminUser = !!session.user.email && ADMIN_LIST.includes(session.user.email);

  const wasRejected = component.moderation_status === 'rejected';
  const needsReview = wasRejected && isPublic && !isAdminUser;
  const actualIsPublic = needsReview ? false : isPublic;
  const newModerationStatus = needsReview ? 'pending_review' : null;

  const updatePayload: Record<string, unknown> = {
    name,
    description,
    category,
    tags,
    is_public: actualIsPublic,
    updated_at: new Date().toISOString(),
    ...(newModerationStatus !== null ? { moderation_status: newModerationStatus } : {}),
    ...(newModerationStatus === null && !wasRejected ? { moderation_status: null } : {}),
  };
  if (imageUrl !== undefined) {
    updatePayload.image_url = imageUrl;
  }

  // 7. Update DB
  const { error: updateError } = await supabaseAdmin
    .from('components')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (updateError) return { error: 'Failed to update component' };

  // 8. Revalidate
  revalidatePath('/dashboard');
  revalidatePath(`/c/${component.slug}`);
  revalidatePath('/browse');

  return { ok: true, pendingReview: newModerationStatus === 'pending_review' };
}
