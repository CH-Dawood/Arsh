import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Best-effort client IP (Vercel and most proxies set x-forwarded-for). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Postgres-backed fixed-window limiter; returns false once `limit` hits occur within the window. */
export async function rateLimit(scope: string, limit: number, windowSeconds: number) {
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: `${scope}:${await clientIp()}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  return !error && data === true;
}

export type ActionState = { ok: boolean; message: string } | null;

export const NOT_LIVE: ActionState = {
  ok: false,
  message: "This opens when the store goes live. The database is not connected yet.",
};
