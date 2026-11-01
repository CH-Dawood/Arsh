"use server";

import { z } from "zod";
import { adminAction, dbMessage, fail } from "@/lib/admin/server";

// The database decides who may do this (only the owner admin); these actions just relay it.

export async function grantSecondAdmin(email: string) {
  return adminAction(async ({ db }) => {
    const parsed = z.email("Enter a valid email address.").max(254).safeParse(email.trim().toLowerCase());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
    const { data: linked, error } = await db.rpc("admin_grant_second", { p_email: parsed.data });
    if (error) {
      if (error.message.includes("ADMIN_LIMIT")) return fail("There are already two admins. Remove the second admin first.");
      if (error.message.includes("ALREADY_ADMIN")) return fail("That email already has admin access.");
      if (error.message.includes("INVALID_EMAIL")) return fail("Enter a valid email address.");
      if (error.message.includes("FORBIDDEN")) return fail("Only the store owner can add an admin.");
      return fail(dbMessage(error));
    }
    return {
      ok: true,
      message: linked
        ? "Admin added. Their account already exists and is confirmed, so they have access now."
        : "Email authorised. They get access after they create an account with this email and confirm it.",
    };
  });
}

export async function revokeSecondAdmin() {
  return adminAction(async ({ db }) => {
    const { error } = await db.rpc("admin_revoke_second");
    if (error) {
      if (error.message.includes("FORBIDDEN")) return fail("Only the store owner can remove an admin.");
      return fail(dbMessage(error));
    }
    return { ok: true, message: "Admin access removed. Their account stays as a customer account." };
  });
}
