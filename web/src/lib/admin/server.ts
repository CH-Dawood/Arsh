import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = undefined> =
  | { ok: true; message: string; data?: T }
  | { ok: false; message: string; errors?: Record<string, string> };

export const fail = (message: string, errors?: Record<string, string>): ActionResult<never> => ({ ok: false, message, errors });

/**
 * Server-side admin check for actions and route handlers. Never trusts the browser:
 * verifies the session JWT, then asks the database (the two-account admin_access allowlist,
 * linked to a confirmed email) via is_admin().
 */
export async function getAdmin() {
  const db = await createClient();
  const { data } = await db.auth.getClaims();
  if (!data?.claims) return null;
  const { data: isAdmin, error } = await db.rpc("is_admin");
  if (error || !isAdmin) return null;
  return { db, userId: data.claims.sub, email: typeof data.claims.email === "string" ? data.claims.email : null };
}
export type AdminContext = NonNullable<Awaited<ReturnType<typeof getAdmin>>>;

/** Runs an admin action: authorises first, turns unexpected errors into a calm message. */
export async function adminAction<T>(run: (ctx: AdminContext) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  const ctx = await getAdmin();
  if (!ctx) return fail("Your admin session has expired. Please sign in again.");
  try {
    return await run(ctx);
  } catch (error) {
    console.error("admin action failed", error);
    return fail("Something went wrong. Please try again.");
  }
}

/** For updates that matched no row, which the database does not treat as an error. */
export const GONE = "That record no longer exists. Refresh the page.";

const known: Record<string, string> = {
  INVALID_STATUS_TRANSITION: "That status change isn't allowed. Cancelled and returned orders are final, and delivered orders can only be marked returned.",
  NOT_FOUND: GONE,
  STALE_ORDER: "This list changed since you opened the page. Refresh and try again.",
  FORBIDDEN: "You don't have permission to do that.",
  VARIANT_REQUIRED: "Add at least one size before saving.",
  INVALID_MODE: "Choose how to change the stock.",
  INVALID_RANGE: "Choose a valid date range (up to 10 years).",
};

/** Maps Postgres / PostgREST errors to messages a store owner can act on. */
export function dbMessage(error: { code?: string; message?: string; details?: string } | null) {
  if (!error) return "Something went wrong.";
  const hit = Object.keys(known).find((k) => error.message?.includes(k));
  if (hit) return known[hit];
  switch (error.code) {
    case "23505":
      return error.message?.includes("slug") ? "That URL name (slug) is already used by another item."
        : error.message?.includes("sku") ? "That SKU is already used by another product."
        : "That value is already in use.";
    case "23503":
      return "This is still in use (for example by products or orders), so it can't be removed.";
    case "23514":
      return error.message?.includes("stock") ? "Stock can't go below zero." : "One of the values is outside the allowed range.";
    case "22P02":
      return "One of the values has the wrong format.";
    case "42501":
      return "You don't have permission to do that.";
    default:
      return "The change couldn't be saved. Please try again.";
  }
}
