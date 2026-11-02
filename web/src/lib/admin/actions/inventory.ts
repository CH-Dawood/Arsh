"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { GONE, adminAction, dbMessage, fail } from "@/lib/admin/server";

const input = z.object({
  variantId: z.uuid(),
  mode: z.enum(["set", "add"]),
  quantity: z.coerce.number().int("Use whole numbers.").min(-100_000).max(100_000),
  note: z.string().trim().max(300).optional(),
});

export async function adjustStock(raw: z.input<typeof input>) {
  return adminAction<{ stock: number }>(async ({ db }) => {
    const parsed = input.safeParse(raw);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the quantity.");
    const { variantId, mode, quantity, note } = parsed.data;
    if (mode === "set" && quantity < 0) return fail("Stock can't be negative.");
    if (mode === "add" && quantity === 0) return fail("Enter how many pieces to add or remove.");

    const { data, error } = await db.rpc("admin_adjust_stock", { p_variant_id: variantId, p_mode: mode, p_quantity: quantity, p_note: note || undefined });
    if (error) return fail(dbMessage(error));
    // No stock comes back when the size no longer exists.
    if (data === null) return fail(GONE);
    updateTag("products");
    return { ok: true, message: `Stock is now ${data}.`, data: { stock: data as number } };
  });
}
