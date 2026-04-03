import { NextResponse, NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { claimComponent } from '@/app/actions/claimComponent';
import config from '@/config';

export const dynamic = 'force-dynamic';

// Called after a successful login. Exchanges the code for a session,
// claims any pending temp component (if slug param present), then redirects.
export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  const slug = requestUrl.searchParams.get('slug');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // If a temp component slug is present, claim it for this user
    if (slug && data.session?.user?.id) {
      await claimComponent(slug, data.session.user.id);
    }
  }

  return NextResponse.redirect(requestUrl.origin + config.auth.callbackUrl);
}
