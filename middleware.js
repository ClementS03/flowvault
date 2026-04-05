import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

// The middleware is used to refresh the user's session before loading Server Component routes
export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  // Protect /admin routes — only admin emails can access (returns 404 to non-admins)
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);
    if (!session || !adminEmails.includes(session.user.email ?? '')) {
      return new Response(null, { status: 404 });
    }
  }

  return res;
}
