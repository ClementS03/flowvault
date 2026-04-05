import { NextResponse, NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { claimComponent } from '@/app/actions/claimComponent';
import { sendEmail } from '@/libs/sendEmail';
import { welcomeEmail, newSignupEmail } from '@/libs/emailTemplates';
import config from '@/config';

export const dynamic = 'force-dynamic';

// Called after a successful login. Exchanges the code for a session,
// claims any pending temp component (if slug param present), then redirects.
// → /onboarding if no username set yet, otherwise /dashboard
export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  const slug = requestUrl.searchParams.get('slug');

  let redirectTo = config.auth.callbackUrl;

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message);
    }

    if (data.session?.user?.id) {
      // Claim pending temp component if any
      if (slug) {
        await claimComponent(slug, data.session.user.id);
      }

      // Check if user has a username — if not, send to onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', data.session.user.id)
        .single();

      if (!profile?.username) {
        redirectTo = '/onboarding';

        // Detect brand-new users (created_at ≈ now, within 30s)
        const createdAt = new Date(data.session.user.created_at).getTime();
        const isNewUser = Date.now() - createdAt < 30_000;
        if (isNewUser && data.session.user.email) {
          sendEmail({
            to: data.session.user.email,
            subject: 'Welcome to FlowVault 👋',
            html: welcomeEmail({}),
          }).catch((err) => console.error('[welcome email]', err));

          // Notify admin of new signup
          const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);
          if (adminEmails.length > 0) {
            sendEmail({
              to: adminEmails.join(','),
              subject: 'New FlowVault signup',
              html: newSignupEmail({ email: data.session.user.email }),
            }).catch((err) => console.error('[signup notification]', err));
          }
        }
      }
    }
  }

  return NextResponse.redirect(requestUrl.origin + redirectTo);
}
