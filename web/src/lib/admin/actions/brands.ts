"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminAction, dbMessage, fail } from "@/lib/admin/server";

const brandInput = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Enter a name.").max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes."),
  description: z.string().trim().max(1000).optional().transform((v) => v || null),
  is_active: z.boolean(),
  is_featured: z.boolean(),
});

// Brand names show on product cards, product pages, the brand pages and the hanger.
const expire = () => ["brands", "products", "collections", "hanger"].forEach((t) => updateTag(t));

export async function saveBrand(input: z.input<typeof brandInput>) {
  return adminAction(async ({ db }) => {
    const parsed = brandInput.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
    const { id, ...row } = parsed.data;
    if (id) {
      const { error } = await db.from("brands").update(row).eq("id", id);
      if (error) return fail(dbMessage(error));
    } else {
      const { data: last } = await db.from("brands").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
      const { error } = await db.from("brands").insert({ ...row, sort_order: (last?.sort_order ?? 0) + 10 });
      if (error) return fail(dbMessage(error));
    }
    expire();
    return { ok: true, message: id ? "Brand saved." : "Brand added." };
  });
}

export async function setBrandActive(id: string, isActive: boolean) {
  return adminAction(async ({ db }) => {
    if (!z.uuid().safeParse(id).success) return fail("Unknown brand.");
    const { error } = await db.from("brands").update({ is_active: isActive }).eq("id", id);
    if (error) return fail(dbMessage(error));
    expire();
    return { ok: true, message: isActive ? "Brand enabled." : "Brand disabled. It stays on its products in the admin but is hidden in the store." };
  });
}

/**
 * Deletes a brand. Products using it are moved to `moveTo`, or have the label cleared when
 * `clear` is set; with neither, a brand that is in use is refused.
 */
export async function deleteBrand(id: string, opts: { moveTo?: string; clear?: boolean } = {}) {
  return adminAction(async ({ db }) => {
    const uuid = z.uuid();
    if (!uuid.safeParse(id).success || (opts.moveTo && !uuid.safeParse(opts.moveTo).success)) return fail("Unknown brand.");
    const { data: moved, error } = await db.rpc("admin_delete_brand", { p_id: id, p_move_to: opts.moveTo || undefined, p_clear: Boolean(opts.clear) });
    if (error) {
      if (error.message.includes("BRAND_IN_USE")) return fail("Products still use this brand. Choose another brand for them, or remove the label from them.");
      if (error.message.includes("INVALID_TARGET_BRAND")) return fail("Choose a different brand to move the products to.");
      return fail(dbMessage(error));
    }
    expire();
    return { ok: true, message: moved ? `Brand deleted. ${moved} product${moved === 1 ? " was" : "s were"} updated.` : "Brand deleted." };
  });
}
