import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Best-effort client IP (Vercel and most proxies set x-forwarded-for). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Postgres-backed fixed-window limiter; returns false once `limit` hits occur within the window.
 * Keyed by client IP, or by `subject` (e.g. an email address) when given, which a caller can't
 * rotate by sending a different X-Forwarded-For header.
 */
export async function rateLimit(scope: string, limit: number, windowSeconds: number, subject?: string) {
  const who = subject ? createHash("sha256").update(subject.trim().toLowerCase()).digest("hex").slice(0, 32) : await clientIp();
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: `${scope}:${who}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  return !error && data === true;
}

/** Only same-site relative paths are allowed as post-login destinations (prevents open redirects). */
export function safeRedirectPath(s: string, fallback = "/account") {
  return s.startsWith("/") && !s.startsWith("//") && !s.includes("\\") && !/[\r\n]/.test(s) ? s : fallback;
}

export type ActionState ={ ok: boolean; message: string } | null;

export const NOT_LIVE: ActionState = {
  ok: false,
  message: "This opens when the store goes live. The database is not connected yet.",
};
