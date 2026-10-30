import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Verified current user (JWT signature checked), or null for guests. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  return claims ? { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null } : null;
}

export async function requireUser(next = "/account") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/**
 * Gate for every admin page and server action. Returns a client that acts as the admin,
 * so RLS and the audit log see the real actor. Non-admins get a 404, not a hint.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=/admin");

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || !isAdmin) notFound();

  return { supabase, userId: data.claims.sub };
}
