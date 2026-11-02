"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { GONE, adminAction, dbMessage, fail } from "@/lib/admin/server";

const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
const link = z.string().trim().max(500).optional().transform((v) => v || null)
  .refine((v) => v === null || /^(\/[^/]|\/$|https:\/\/)/.test(v), "Links start with / (a page on this site) or https://");

const bannerInput = z.object({
  id: z.uuid().optional(),
  title: optText(80),
  heading: z.string().trim().min(2, "Enter a heading.").max(80),
  subheading: optText(200),
  promo_text: optText(80),
  cta_label: optText(30),
  cta_href: link,
  image_path: z.string().trim().min(3, "Upload a desktop image.").max(500),
  mobile_image_path: optText(500),
  alt: z.string().trim().max(200).optional(),
  is_active: z.boolean(),
});
export type BannerInput = z.input<typeof bannerInput>;

const expire = () => updateTag("banners");

export async function saveBanner(input: BannerInput) {
  return adminAction<{ id: string }>(async ({ db }) => {
    const parsed = bannerInput.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return fail(issue?.message ?? "Check the form.", { [String(issue?.path[0] ?? "form")]: issue?.message ?? "" });
    }
    const { id, alt, ...row } = parsed.data;
    if (row.cta_label && !row.cta_href) return fail("Add a link for the button, or clear the button text.", { cta_href: "Required with button text" });
    const values = { ...row, alt: alt || row.heading };
    if (id) {
      const { error, count } = await db.from("banners").update(values, { count: "exact" }).eq("id", id);
      if (error) return fail(dbMessage(error));
      if (!count) return fail(GONE);
      expire();
      return { ok: true, message: "Banner saved.", data: { id } };
    }
    const { data: last } = await db.from("banners").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await db.from("banners").insert({ ...values, sort_order: (last?.sort_order ?? 0) + 10 }).select("id").single();
    if (error || !data) return fail(dbMessage(error));
    expire();
    return { ok: true, message: "Banner added.", data: { id: data.id } };
  });
}

export async function setBannerActive(id: string, active: boolean) {
  return adminAction(async ({ db }) => {
    if (!z.uuid().safeParse(id).success) return fail("Unknown banner.");
    const { error, count } = await db.from("banners").update({ is_active: active }, { count: "exact" }).eq("id", id);
    if (error) return fail(dbMessage(error));
    if (!count) return fail(GONE);
    expire();
    return { ok: true, message: active ? "Banner is live on the homepage." : "Banner hidden from the homepage." };
  });
}

export async function deleteBanner(id: string) {
  return adminAction(async ({ db }) => {
    if (!z.uuid().safeParse(id).success) return fail("Unknown banner.");
    const { data: row } = await db.from("banners").select("image_path, mobile_image_path").eq("id", id).maybeSingle();
    const { error, count } = await db.from("banners").delete({ count: "exact" }).eq("id", id);
    if (error) return fail(dbMessage(error));
    if (!count) return fail("That banner no longer exists.");
    // Uploaded files are removed unless another banner still uses them.
    const paths = [row?.image_path, row?.mobile_image_path].filter((p): p is string => Boolean(p && !p.startsWith("https://")));
    if (paths.length) {
      const { data: shared } = await db.from("banners").select("image_path, mobile_image_path").or(paths.map((p) => `image_path.eq."${p}",mobile_image_path.eq."${p}"`).join(","));
      const inUse = new Set((shared ?? []).flatMap((b) => [b.image_path, b.mobile_image_path]));
      const unused = paths.filter((p) => !inUse.has(p));
      if (unused.length) await db.storage.from("catalog").remove(unused);
    }
    expire();
    return { ok: true, message: "Banner deleted." };
  });
}

/** Saves a new display order: the ids in the order they should appear. */
export async function reorderBanners(ids: string[]) {
  return adminAction(async ({ db }) => {
    if (!z.array(z.uuid()).max(50).safeParse(ids).success) return fail("Unknown banners.");
    for (const [n, id] of ids.entries()) {
      const { error, count } = await db.from("banners").update({ sort_order: (n + 1) * 10 }, { count: "exact" }).eq("id", id);
      if (error) return fail(dbMessage(error));
      if (!count) return fail(GONE);
    }
    expire();
    return { ok: true, message: "Banner order saved." };
  });
}
