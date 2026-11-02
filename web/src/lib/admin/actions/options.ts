"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { GONE, adminAction, dbMessage, fail } from "@/lib/admin/server";

// Size labels and colour names show on product pages, in bags and in the size filter.
const expire = () => ["products", "collections"].forEach((t) => updateTag(t));

const sizeInput = z.object({
  id: z.uuid().optional(),
  code: z.string().trim().min(1, "Enter a size code.").max(20).regex(/^[A-Za-z0-9_-]+$/, "Size codes use letters, numbers, dashes or underscores."),
  label: z.string().trim().min(1, "Enter the size name.").max(40),
});

export async function saveSize(input: z.input<typeof sizeInput>) {
  return adminAction(async ({ db }) => {
    const parsed = sizeInput.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
    const { id, code, label } = parsed.data;
    if (id) {
      // The code stays fixed once created: filter links and SKUs refer to it.
      const { error, count } = await db.from("sizes").update({ label }, { count: "exact" }).eq("id", id);
      if (error) return fail(dbMessage(error));
      if (!count) return fail(GONE);
    } else {
      const { data: last } = await db.from("sizes").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
      const { error } = await db.from("sizes").insert({ code: code.toUpperCase(), label, sort_order: (last?.sort_order ?? 0) + 10 });
      if (error) return fail(error.code === "23505" ? "That size code already exists." : dbMessage(error));
    }
    expire();
    return { ok: true, message: id ? "Size saved." : "Size added." };
  });
}

/** Saves the full size order (ids top to bottom) in one transaction. */
export async function reorderSizes(ids: string[]) {
  return adminAction(async ({ db }) => {
    if (!z.array(z.uuid()).max(100).safeParse(ids).success) return fail("Unknown sizes.");
    const { error } = await db.rpc("admin_set_order", { p_table: "sizes", p_ids: ids });
    if (error) return fail(dbMessage(error));
    expire();
    return { ok: true, message: "Size order saved." };
  });
}

const colorInput = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Enter the colour name.").max(40),
  hex: z.union([z.literal(""), z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Colours look like #A8864E.")]).transform((v) => v || null),
});

export async function saveColor(input: z.input<typeof colorInput>) {
  return adminAction(async ({ db }) => {
    const parsed = colorInput.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
    const { id, ...row } = parsed.data;
    if (id) {
      const { error, count } = await db.from("colors").update(row, { count: "exact" }).eq("id", id);
      if (error) return fail(error.code === "23505" ? "That colour already exists." : dbMessage(error));
      if (!count) return fail(GONE);
    } else {
      const { error } = await db.from("colors").insert(row);
      if (error) return fail(error.code === "23505" ? "That colour already exists." : dbMessage(error));
    }
    expire();
    return { ok: true, message: id ? "Colour saved." : "Colour added." };
  });
}

// Sizes and colours used by a product can't be deleted: the database refuses (foreign key).
export async function deleteOption(kind: "size" | "color", id: string) {
  return adminAction(async ({ db }) => {
    if (!z.uuid().safeParse(id).success) return fail("Unknown item.");
    const { error, count } = await db.from(kind === "size" ? "sizes" : "colors").delete({ count: "exact" }).eq("id", id);
    if (error) return fail(error.code === "23503" ? `Products still use this ${kind === "size" ? "size" : "colour"}, so it can't be deleted.` : dbMessage(error));
    if (!count) return fail(GONE);
    expire();
    return { ok: true, message: kind === "size" ? "Size deleted." : "Colour deleted." };
  });
}
