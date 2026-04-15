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

  // Auth required to copy any component
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate UUID format to prevent garbage DB calls
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Only increment copy_count for public components
  const { data: component } = await supabaseAdmin
    .from('components')
    .select('copy_count, is_public')
    .eq('id', id)
    .single();

  if (component?.is_public) {
    await supabaseAdmin
      .from('components')
      .update({ copy_count: (component.copy_count ?? 0) + 1 })
      .eq('id', id);
  }

  // Increment kit copy_count if called from a kit page
  const kitId = req.nextUrl.searchParams.get('kit_id');
  if (kitId && UUID_RE.test(kitId)) {
    const { data: kit } = await supabaseAdmin
      .from('kits')
      .select('copy_count')
      .eq('id', kitId)
      .single();
    if (kit) {
      await supabaseAdmin
        .from('kits')
        .update({ copy_count: (kit.copy_count ?? 0) + 1 })
        .eq('id', kitId);
    }
  }

  return NextResponse.json({ ok: true });
}
