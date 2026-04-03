'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { slugify } from '@/libs/slugify';
import { hashPassword } from '@/libs/hashPassword';
import supabaseAdmin from '@/libs/supabaseAdmin';

export async function createComponent(
  formData: FormData,
  jsonString: string
): Promise<{ slug: string }> {
  // Get current user (may be null for anonymous users)
  const supabase = createServerActionClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;

  // Parse form fields
  const name = (formData.get('name') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const category = (formData.get('category') as string) || null;
  const tagsRaw = (formData.get('tags') as string) || '';
  const tags = tagsRaw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);
  const isPublic = formData.get('is_public') === 'true';
  const passwordRaw = (formData.get('password') as string) || null;
  const imageFile = formData.get('preview_image') as File | null;

  if (!name) throw new Error('Component name is required');
  if (name.length > 60) throw new Error('Name must be 60 characters or less');

  // Validate Webflow JSON
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.type !== '@webflow/XscpData') {
      throw new Error('Invalid Webflow component data');
    }
  } catch {
    throw new Error('Invalid component JSON');
  }

  const componentId = crypto.randomUUID();
  const slug = slugify(name);

  // Upload JSON to Supabase Storage
  const jsonPath = userId
    ? `${userId}/${componentId}.json`
    : `anonymous/${componentId}.json`;

  const { error: jsonError } = await supabaseAdmin.storage
    .from('components-json')
    .upload(jsonPath, new Blob([jsonString], { type: 'application/json' }), {
      contentType: 'application/json',
    });

  if (jsonError) throw new Error('Failed to store component data');

  // Upload preview image if provided
  let imageUrl: string | null = null;
  if (imageFile && imageFile.size > 0) {
    const imagePath = `${componentId}.jpg`;
    const { error: imgError } = await supabaseAdmin.storage
      .from('component-previews')
      .upload(imagePath, imageFile, {
        contentType: imageFile.type,
        upsert: true,
      });

    if (!imgError) {
      const {
        data: { publicUrl },
      } = supabaseAdmin.storage
        .from('component-previews')
        .getPublicUrl(imagePath);
      imageUrl = publicUrl;
    }
  }

  // Hash password if component is password-protected
  let passwordHash: string | null = null;
  if (!isPublic && passwordRaw) {
    passwordHash = await hashPassword(passwordRaw);
  }

  // Insert component row
  const isTemporary = !userId;
  const expiresAt = isTemporary
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error: insertError } = await supabaseAdmin.from('components').insert({
    id: componentId,
    user_id: userId,
    name,
    description,
    category,
    tags,
    slug,
    json_path: jsonPath,
    image_url: imageUrl,
    is_public: isPublic,
    password_hash: passwordHash,
    is_temporary: isTemporary,
    expires_at: expiresAt,
    copy_count: 0,
  });

  if (insertError) {
    // Clean up storage on DB failure
    await supabaseAdmin.storage.from('components-json').remove([jsonPath]);
    throw new Error('Failed to save component');
  }

  // Increment component_count for logged-in users
  if (userId) {
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

  return { slug };
}
