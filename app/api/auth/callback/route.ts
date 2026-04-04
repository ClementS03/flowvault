import { NextResponse, NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { claimComponent } from '@/app/actions/claimComponent';
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
      }
    }
  }

  return NextResponse.redirect(requestUrl.origin + redirectTo);
}
