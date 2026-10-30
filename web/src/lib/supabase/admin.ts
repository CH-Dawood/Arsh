import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

const secretKey = process.env.SUPABASE_SECRET_KEY;

/**
 * Privileged client that bypasses RLS. Only for trusted server code that has already
 * authenticated and authorised the caller (checkout, tracking, rate limiting, webhooks).
 */
export function createAdminClient() {
  if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is not configured");
  return createClient<Database>(env.supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cookie-free client for public catalogue reads inside cached functions (RLS still applies). */
export function createPublicClient() {
  return createClient<Database>(env.supabaseUrl, env.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
