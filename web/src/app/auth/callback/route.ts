import { NextResponse, type NextRequest } from "next/server";
import { safeRedirectPath } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for links in Supabase emails (password reset). Swaps the one-time code for a
 * session, then continues to a same-site page only.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next") ?? "", "/account");

  if (code) {
    const { error } = await (await createClient()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL("/forgot-password?expired=1", request.url));
}
