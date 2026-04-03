import { NextResponse, NextRequest } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// This route is used to store the leads that are generated from the landing page.
// The API call is initiated by <ButtonLead /> component
export async function POST(req: NextRequest) {
  const body = await req.json();

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!body.email || !EMAIL_RE.test(String(body.email))) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  try {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.from("leads").insert({ email: body.email });

    return NextResponse.json({});
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
