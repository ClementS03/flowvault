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

  // Email the author if requested
  if (sendNotification && component.user_id) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', component.user_id)
      .single();

    if (profile) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(component.user_id);
      const authorEmail = authUser?.user?.email;
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
        } catch (err) {
          console.error('[moderation rejected email] Failed to send to', authorEmail, ':', err);
        }
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

  // Email the author
  if (component.user_id) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(component.user_id);
    const authorEmail = authUser?.user?.email;
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
      } catch (err) {
        console.error('[moderation approved email] Failed to send to', authorEmail, ':', err);
      }
    }
  }

  revalidatePath('/admin');
  revalidatePath(`/c/${component.slug}`);
  revalidatePath('/browse');
  return { ok: true };
}
