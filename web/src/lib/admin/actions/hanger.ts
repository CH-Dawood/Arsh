"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminAction, dbMessage, fail } from "@/lib/admin/server";

const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
const path = z.string().trim().max(500).optional().transform((v) => v || null);

const hangerInput = z.object({
  settings: z.object({
    is_enabled: z.boolean(),
    eyebrow: z.string().trim().max(60),
    heading: z.string().trim().min(2, "Enter a section heading.").max(80),
    subtitle: optText(300),
    caption: optText(200),
    cta_label: z.string().trim().min(2, "Enter the button text.").max(40),
    cta_href: z.string().trim().regex(/^(\/[^/]|\/$|https:\/\/)/, "Button links start with / (a page on this site) or https://").max(500),
    max_items: z.coerce.number().int().min(3, "Show at least 3 pieces.").max(12, "Show at most 12 pieces."),
    autoplay: z.boolean(),
    interval_ms: z.coerce.number().int().min(2000, "Autoplay speed is 2–8 seconds.").max(8000, "Autoplay speed is 2–8 seconds."),
    featured_product_id: z.union([z.literal(""), z.uuid()]).optional(),
  }),
  items: z.array(z.object({
    product_id: z.uuid(),
    image_path: path,
    back_image_path: path,
    title: z.string().trim().max(150).optional().transform((v) => v || null).refine((v) => v === null || v.length >= 2, "Custom names need at least 2 characters."),
    description: optText(300),
    is_active: z.boolean(),
  })).max(40, "Up to 40 pieces can be saved."),
});
export type HangerInput = z.input<typeof hangerInput>;

/** Publishes the whole hanger (settings, pieces, order and featured piece) in one database transaction. */
export async function saveHanger(input: HangerInput) {
  return adminAction(async ({ db }) => {
    const parsed = hangerInput.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the hanger settings.");
    const { settings, items } = parsed.data;
    if (new Set(items.map((i) => i.product_id)).size !== items.length) return fail("Each product can hang on the rail only once.");
    const featured = settings.featured_product_id || null;
    if (featured && !items.some((i) => i.product_id === featured && i.is_active)) {
      return fail("The featured piece must be one of the enabled pieces on the rail.");
    }
    const { data: before } = await db.from("hanger_items").select("image_path, back_image_path");
    const { error } = await db.rpc("admin_save_hanger", {
      p_settings: { ...settings, featured_product_id: featured },
      p_items: items,
    });
    if (error) return fail(dbMessage(error));
    // Photos uploaded just for the hanger that no piece uses any more are removed from storage.
    const inUse = new Set(items.flatMap((i) => [i.image_path, i.back_image_path]));
    const unused = [...new Set((before ?? []).flatMap((b) => [b.image_path, b.back_image_path]))]
      .filter((p): p is string => Boolean(p?.startsWith("hanger/")) && !inUse.has(p));
    if (unused.length) await db.storage.from("catalog").remove(unused);
    updateTag("hanger");
    return { ok: true, message: "Published. The homepage hanger now shows these changes." };
  });
}
