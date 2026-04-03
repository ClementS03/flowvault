import { createClient } from '@supabase/supabase-js';

/**
 * Supabase admin client using the service role key.
 * Bypasses RLS — only use in Server Actions / API routes, never in client code.
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default supabaseAdmin;
