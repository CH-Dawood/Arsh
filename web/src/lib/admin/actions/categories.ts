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
  /** Adds (or removes) the category's tile in the homepage "Shop by Category" section. */
  on_homepage: z.boolean().optional(),
});

const expire = () => ["categories", "collections", "products"].forEach((t) => updateTag(t));

export async function saveCategory(input: z.input<typeof categoryInput>) {
  return adminAction(async ({ db }) => {
    const parsed = categoryInput.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
    const { id: existing, on_homepage, ...row } = parsed.data;
    let id = existing;
    if (id) {
      const { error } = await db.from("categories").update(row).eq("id", id);
      if (error) return fail(dbMessage(error));
    } else {
      const { data: last } = await db.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
      const { data, error } = await db.from("categories").insert({ ...row, sort_order: (last?.sort_order ?? 0) + 10 }).select("id").single();
      if (error || !data) return fail(dbMessage(error));
      id = data.id;
    }

    if (on_homepage !== undefined) {
      const { data: tile } = await db.from("home_sections").select("id").eq("category_id", id).maybeSingle();
      const title = row.name.slice(0, 60);
      if (on_homepage && tile) {
        const { error } = await db.from("home_sections").update({ title }).eq("id", tile.id);
        if (error) return fail(dbMessage(error));
      } else if (on_homepage) {
        // Tile URLs (/collections/<slug>) must be unique among all homepage sections.
        const { data: taken } = await db.from("home_sections").select("slug").like("slug", `${row.slug}%`);
        const used = new Set((taken ?? []).map((t) => t.slug));
        const slug = used.has(row.slug) ? [`${row.slug}-collection`, ...Array.from({ length: 20 }, (_, n) => `${row.slug}-${n + 2}`)].find((s) => !used.has(s))! : row.slug;
        const { data: lastTile } = await db.from("home_sections").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
        const { error } = await db.from("home_sections").insert({ title, slug, kind: "category", category_id: id, sort_order: (lastTile?.sort_order ?? 0) + 10 });
        if (error) return fail(dbMessage(error));
      } else if (tile) {
        const { error } = await db.from("home_sections").delete().eq("id", tile.id);
        if (error) return fail(dbMessage(error));
      }
    }
    expire();
    return { ok: true, message: existing ? "Category saved." : "Category added." };
  });
}

/** Deletes a category. Its products, if any, are moved to `moveTo` first (in the same transaction). */
export async function deleteCategory(id: string, moveTo?: string) {
  return adminAction(async ({ db }) => {
    if (!z.uuid().safeParse(id).success || (moveTo && !z.uuid().safeParse(moveTo).success)) return fail("Unknown category.");
    const { data: row } = await db.from("categories").select("image_path").eq("id", id).maybeSingle();
    const { data: moved, error } = await db.rpc("admin_delete_category", { p_id: id, p_move_to: moveTo || undefined });
    if (error) {
      if (error.message.includes("CATEGORY_NOT_EMPTY")) return fail("This category still has products. Choose a category to move them to.");
      if (error.message.includes("INVALID_TARGET_CATEGORY")) return fail("Choose a different category to move the products to.");
      return fail(dbMessage(error));
    }
    // Its uploaded image goes too, unless something else still shows it.
    const path = row?.image_path;
    if (path?.startsWith("categories/")) {
      const [{ count: cats }, { count: tiles }] = await Promise.all([
        db.from("categories").select("id", { count: "exact", head: true }).eq("image_path", path),
        db.from("home_sections").select("id", { count: "exact", head: true }).eq("image_path", path),
      ]);
      if (!cats && !tiles) await db.storage.from("catalog").remove([path]);
    }
    expire();
    updateTag("hanger");
    return { ok: true, message: moved ? `Category deleted. ${moved} product${moved === 1 ? " was" : "s were"} moved.` : "Category deleted." };
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
