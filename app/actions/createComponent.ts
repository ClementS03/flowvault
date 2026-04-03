'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { slugify } from '@/libs/slugify';
import { hashPassword } from '@/libs/hashPassword';
import supabaseAdmin from '@/libs/supabaseAdmin';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);

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
  if (description && description.length > 200) throw new Error('Description must be 200 characters or less');

  // Validate Webflow JSON — split so inner parse error isn't swallowed by type check
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid component JSON');
  }
  if ((parsed as { type?: string })?.type !== '@webflow/XscpData') {
    throw new Error('Invalid Webflow component data');
  }

  // Enforce free plan limit before any storage uploads to avoid orphaned files
  let currentComponentCount = 0;
  if (userId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('component_count, plan')
      .eq('id', userId)
      .single();

    const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email);
    if (!isAdmin && profile?.plan === 'free' && (profile?.component_count ?? 0) >= 10) {
      throw new Error('Free plan limit reached. Upgrade to Pro for unlimited components.');
    }
    currentComponentCount = profile?.component_count ?? 0;
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

  // Upload preview image if provided.
  // Image upload failure is non-fatal: the component is created without a preview image
  // rather than blocking the entire upload. The caller receives { slug } with no error signal.
  let imageUrl: string | null = null;
  let imagePath: string | null = null;

  if (imageFile && imageFile.size > 0) {
    if (!['image/jpeg', 'image/png'].includes(imageFile.type)) {
      throw new Error('Preview image must be a JPEG or PNG file');
    }
    if (imageFile.size > 2 * 1024 * 1024) {
      throw new Error('Preview image must be under 2MB');
    }

    const ext = imageFile.type === 'image/png' ? 'png' : 'jpg';
    const candidatePath = `${componentId}.${ext}`;

    const { error: imgError } = await supabaseAdmin.storage
      .from('component-previews')
      .upload(candidatePath, imageFile, {
        contentType: imageFile.type,
        upsert: true,
      });

    if (imgError) {
      console.error('[createComponent] Preview image upload failed:', imgError.message);
    } else {
      imagePath = candidatePath;
      const {
        data: { publicUrl },
      } = supabaseAdmin.storage
        .from('component-previews')
        .getPublicUrl(candidatePath);
      imageUrl = publicUrl;
    }
  }

  // Hash password if component is password-protected.
  // If is_public is true, any provided password is intentionally ignored.
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
    await Promise.all([
      supabaseAdmin.storage.from('components-json').remove([jsonPath]),
      imagePath
        ? supabaseAdmin.storage.from('component-previews').remove([imagePath])
        : Promise.resolve(),
    ]);
    throw new Error('Failed to save component');
  }

  // Increment component_count using the count fetched during plan-limit check
  if (userId) {
    await supabaseAdmin
      .from('profiles')
      .update({ component_count: currentComponentCount + 1 })
      .eq('id', userId);
  }

  revalidatePath('/dashboard');

  return { slug };
}
