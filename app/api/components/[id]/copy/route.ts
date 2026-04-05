import { NextResponse, NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import supabaseAdmin from '@/libs/supabaseAdmin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Validate UUID format to prevent garbage DB calls
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Fetch component first to determine if it's public
  const { data: component } = await supabaseAdmin
    .from('components')
    .select('copy_count, is_public')
    .eq('id', id)
    .single();

  if (!component) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  // Public components can be copied by anyone (guests via direct share link).
  // Private components require authentication.
  if (!component.is_public) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Only increment copy_count for public components
  if (component.is_public) {
    await supabaseAdmin
      .from('components')
      .update({ copy_count: (component.copy_count ?? 0) + 1 })
      .eq('id', id);
  }

  return NextResponse.json({ ok: true });
}
