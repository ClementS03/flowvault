'use server';

import { cookies } from 'next/headers';
import supabaseAdmin from '@/libs/supabaseAdmin';
import { verifyPassword } from '@/libs/hashPassword';

export async function verifyComponentPassword(
  id: string,
  password: string
): Promise<{ ok: true } | { error: string }> {
  const { data: component } = await supabaseAdmin
    .from('components')
    .select('password_hash')
    .eq('id', id)
    .single();

  if (!component?.password_hash) return { error: 'No password set' };

  const valid = await verifyPassword(password, component.password_hash);
  if (!valid) return { error: 'Incorrect password' };

  cookies().set(`unlock_${id}`, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 24h
    sameSite: 'lax',
    path: '/',
  });

  return { ok: true };
}
