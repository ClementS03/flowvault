import { NextResponse, NextRequest } from 'next/server';
import supabaseAdmin from '@/libs/supabaseAdmin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Validate UUID format to prevent garbage DB calls
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Only increment for public components — prevents inflating counts on private ones
  const { data: component } = await supabaseAdmin
    .from('components')
    .select('copy_count, is_public')
    .eq('id', id)
    .single();

  if (component !== null && component.is_public) {
    await supabaseAdmin
      .from('components')
      .update({ copy_count: (component.copy_count ?? 0) + 1 })
      .eq('id', id);
  }

  return NextResponse.json({ ok: true });
}
