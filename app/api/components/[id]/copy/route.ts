import { NextResponse, NextRequest } from 'next/server';
import supabaseAdmin from '@/libs/supabaseAdmin';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Fetch current count and increment — this is a metric counter,
  // slight inaccuracy under concurrent requests is acceptable.
  const { data: component } = await supabaseAdmin
    .from('components')
    .select('copy_count')
    .eq('id', id)
    .single();

  if (component !== null) {
    await supabaseAdmin
      .from('components')
      .update({ copy_count: (component.copy_count ?? 0) + 1 })
      .eq('id', id);
  }

  return NextResponse.json({ ok: true });
}
