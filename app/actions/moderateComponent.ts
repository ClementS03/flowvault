'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import supabaseAdmin from '@/libs/supabaseAdmin';
import { sendEmail } from '@/libs/sendEmail';
import { moderationRejectedEmail, moderationApprovedEmail } from '@/libs/emailTemplates';

type Result = { ok: true } | { error: string };

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);

function isAdmin(email: string | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}

async function resolveAuthorEmail(userId: string, fallbackEmail?: string | null): Promise<string | null> {
  // 1. Try JS admin client
  try {
    const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) console.error('[resolveAuthorEmail] getUserById error:', error.message);
    if (authUser?.user?.email) {
      console.log('[resolveAuthorEmail] Got email via admin API');
      return authUser.user.email;
    }
  } catch (err) {
    console.error('[resolveAuthorEmail] getUserById threw:', err);
  }

  // 2. Fallback: direct REST call to Supabase Auth Admin API
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (res.ok) {
      const user = await res.json() as { email?: string };
      if (user?.email) {
        console.log('[resolveAuthorEmail] Got email via REST fallback');
        return user.email;
      }
    } else {
      const body = await res.text();
      console.error('[resolveAuthorEmail] REST API responded:', res.status, body);
    }
  } catch (err) {
    console.error('[resolveAuthorEmail] REST fallback threw:', err);
  }

  // 3. Last resort: session email (when admin unpublishes their own component)
  if (fallbackEmail) {
    console.log('[resolveAuthorEmail] Using session email fallback:', fallbackEmail);
    return fallbackEmail;
  }

  console.warn('[resolveAuthorEmail] Could not resolve email for user:', userId);
  return null;
}

/** Admin rejects a public component — makes it private, optionally emails the author */
export async function rejectComponent(
  componentId: string,
  reason: string,
  sendNotification: boolean
): Promise<Result> {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!isAdmin(session?.user?.email)) return { error: 'Unauthorized' };

  const { data: component, error: fetchError } = await supabaseAdmin
    .from('components')
    .select('name, slug, user_id, is_public')
    .eq('id', componentId)
    .single();

  if (fetchError || !component) return { error: 'Component not found' };

  const { error: updateError } = await supabaseAdmin
    .from('components')
    .update({
      is_public: false,
      moderation_status: 'rejected',
      moderation_note: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', componentId);

  if (updateError) return { error: 'Failed to update component' };

  console.log('[rejectComponent] DB updated. sendNotification:', sendNotification, 'user_id:', component.user_id);

  if (sendNotification && component.user_id) {
    // Use session email as fallback (admin unpublishing their own component)
    const sessionEmail = session.user.id === component.user_id ? session.user.email : null;
    const authorEmail = await resolveAuthorEmail(component.user_id, sessionEmail);

    if (authorEmail) {
      try {
        await sendEmail({
          to: authorEmail,
          subject: `Your component "${component.name}" was removed from Browse`,
          html: moderationRejectedEmail({
            componentName: component.name,
            reason,
            componentSlug: component.slug,
          }),
        });
        console.log('[rejectComponent] Email sent to', authorEmail);
      } catch (err) {
        console.error('[rejectComponent] Email failed:', err);
      }
    }
  }

  revalidatePath('/admin');
  revalidatePath(`/c/${component.slug}`);
  revalidatePath('/browse');
  return { ok: true };
}

/** Admin approves a component pending re-review — makes it public */
export async function approveComponent(componentId: string): Promise<Result> {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!isAdmin(session?.user?.email)) return { error: 'Unauthorized' };

  const { data: component, error: fetchError } = await supabaseAdmin
    .from('components')
    .select('name, slug, user_id')
    .eq('id', componentId)
    .single();

  if (fetchError || !component) return { error: 'Component not found' };

  const { error: updateError } = await supabaseAdmin
    .from('components')
    .update({
      is_public: true,
      moderation_status: 'approved',
      moderation_note: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', componentId);

  if (updateError) return { error: 'Failed to approve component' };

  console.log('[approveComponent] DB updated. user_id:', component.user_id);

  if (component.user_id) {
    const authorEmail = await resolveAuthorEmail(component.user_id);
    if (authorEmail) {
      try {
        await sendEmail({
          to: authorEmail,
          subject: `Your component "${component.name}" is now live on Browse 🎉`,
          html: moderationApprovedEmail({
            componentName: component.name,
            componentSlug: component.slug,
          }),
        });
        console.log('[approveComponent] Email sent to', authorEmail);
      } catch (err) {
        console.error('[approveComponent] Email failed:', err);
      }
    }
  }

  revalidatePath('/admin');
  revalidatePath(`/c/${component.slug}`);
  revalidatePath('/browse');
  return { ok: true };
}
