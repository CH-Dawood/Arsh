"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminAction, dbMessage, fail } from "@/lib/admin/server";

const categoryInput = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Enter a category name.").max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes."),
  description: z.string().trim().max(1000).optional().transform((v) => v || null),
  image_path: z.string().trim().max(500).optional().transform((v) => v || null),
  is_active: z.boolean(),
});

const expire = () => ["categories", "collections", "products"].forEach((t) => updateTag(t));

export async function saveCategory(input: z.input<typeof categoryInput>) {
  return adminAction(async ({ db }) => {
    const parsed = categoryInput.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
    const { id, ...row } = parsed.data;
    if (id) {
      const { error } = await db.from("categories").update(row).eq("id", id);
      if (error) return fail(dbMessage(error));
    } else {
      const { data: last } = await db.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
      const { error } = await db.from("categories").insert({ ...row, sort_order: (last?.sort_order ?? 0) + 10 });
      if (error) return fail(dbMessage(error));
    }
    expire();
    return { ok: true, message: id ? "Category saved." : "Category added." };
  });
}

export async function deleteCategory(id: string) {
  return adminAction(async ({ db }) => {
    if (!z.uuid().safeParse(id).success) return fail("Unknown category.");
    const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
    if (count) return fail(`This category still has ${count} product${count === 1 ? "" : "s"}. Move them to another category first.`);
    const { error } = await db.from("categories").delete().eq("id", id);
    if (error) return fail(dbMessage(error));
    expire();
    return { ok: true, message: "Category deleted." };
  });
}

/** Swaps display order with the neighbour above or below. */
export async function moveCategory(id: string, direction: "up" | "down") {
  return adminAction(async ({ db }) => {
    const { data: all, error } = await db.from("categories").select("id, sort_order").order("sort_order").order("name");
    if (error || !all) return fail(dbMessage(error));
    const i = all.findIndex((c) => c.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= all.length) return { ok: true, message: "Order unchanged." };
    // Re-number everything so equal sort values can't block a move.
    const order = all.map((c) => c.id);
    [order[i], order[j]] = [order[j], order[i]];
    for (const [n, cid] of order.entries()) {
      const { error: e } = await db.from("categories").update({ sort_order: (n + 1) * 10 }).eq("id", cid);
      if (e) return fail(dbMessage(e));
    }
    expire();
    return { ok: true, message: "Display order updated." };
  });
}
