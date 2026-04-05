import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import supabaseAdmin from '@/libs/supabaseAdmin';

export async function GET(req: NextRequest) {
  // Only logged-in users need to check username availability
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ available: false }, { status: 401 });
  }

  const username = req.nextUrl.searchParams.get('username')?.trim().toLowerCase();

  if (!username || username.length < 3) {
    return NextResponse.json({ available: false });
  }
  if (username.length > 30 || !/^[a-z0-9-]+$/.test(username)) {
    return NextResponse.json({ available: false });
  }

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  return NextResponse.json({ available: !data });
}
