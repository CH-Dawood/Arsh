"use server";

import { z } from "zod";
import { GONE, adminAction, dbMessage, fail } from "@/lib/admin/server";

const profileInput = z.object({
  full_name: z.string().trim().min(2, "Enter your name.").max(120),
  phone: z.string().trim().max(20).optional().transform((v) => v || null)
    .refine((v) => v === null || /^(\+?92|0)3\d{2}[\s-]?\d{7}$/.test(v), "Enter a mobile number like 0300 1234567."),
});

/** Updates only the signed-in admin's own name and phone; the role column is guarded in the database. */
export async function saveAdminProfile(input: z.input<typeof profileInput>) {
  return adminAction(async ({ db, userId }) => {
    const parsed = profileInput.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
    const { error, count } = await db.from("profiles").update(parsed.data, { count: "exact" }).eq("id", userId);
    if (error) return fail(dbMessage(error));
    if (!count) return fail(GONE);
    return { ok: true, message: "Profile updated." };
  });
}
