"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { GONE, adminAction, dbMessage, fail } from "@/lib/admin/server";
import { imageUrl } from "@/lib/catalog/supabase-source";

const slug = z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes for the URL name.");
const money = z.coerce.number().int("Prices are whole rupees.").positive("Enter a price above zero.").max(10_000_000);
const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);
const uuid = z.uuid();

const productInput = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2, "Enter a product name.").max(150),
  slug,
  category_id: z.uuid("Choose a category."),
  brand_id: z.union([z.literal(""), uuid]).optional(),
  regular_price: money,
  sale_price: z.union([z.literal(""), money]).optional(),
  short_description: optText(300),
  description: optText(5000),
  fabric: optText(300),
  embroidery: optText(500),
  care_instructions: optText(1000),
  piece_count: z.union([z.literal(""), z.coerce.number().int().min(1).max(3)]).optional(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  is_new_arrival: z.boolean(),
  is_best_seller: z.boolean(),
  is_luxury: z.boolean(),
  seo_title: optText(70),
  seo_description: optText(170),
  images: z.array(z.object({ id: uuid.optional(), storage_path: z.string().min(3).max(500), alt: optText(200) })).max(12, "Up to 12 photos per product."),
  variants: z.array(z.object({
    id: uuid.optional(),
    size_id: z.uuid("Choose a size for every row."),
    color_id: z.union([z.literal(""), uuid]).optional(),
    sku: z.string().trim().min(2, "Every size needs a SKU.").max(64),
    stock: z.coerce.number().int().min(0, "Stock can't be negative.").max(100_000),
    is_active: z.boolean(),
  })).min(1, "Add at least one size."),
});
export type ProductInput = z.input<typeof productInput>;

export async function saveProduct(input: ProductInput) {
  return adminAction<{ id: string }>(async ({ db }) => {
    const parsed = productInput.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return fail(issue?.message ?? "Check the form.", { [String(issue?.path[0] ?? "form")]: issue?.message ?? "" });
    }
    const p = parsed.data;
    const sale = p.sale_price === "" || p.sale_price === undefined ? null : p.sale_price;
    if (sale !== null && sale >= p.regular_price) return fail("The sale price must be lower than the regular price.", { sale_price: "Must be lower than the regular price" });
    const combos = new Set(p.variants.map((v) => `${v.size_id}:${v.color_id || ""}`));
    if (combos.size !== p.variants.length) return fail("Each size and colour combination can only appear once.");

    const { data, error } = await db.rpc("admin_save_product", {
      p_product: {
        id: p.id ?? null, name: p.name, slug: p.slug, category_id: p.category_id, brand_id: p.brand_id || null,
        // Storefront model: base_price is what the customer pays, compare_at_price the struck-through original.
        base_price: sale ?? p.regular_price, compare_at_price: sale !== null ? p.regular_price : null,
        short_description: p.short_description ?? null, description: p.description ?? null, fabric: p.fabric ?? null,
        embroidery: p.embroidery ?? null, care_instructions: p.care_instructions ?? null,
        piece_count: p.piece_count === "" || p.piece_count === undefined ? null : p.piece_count,
        is_active: p.is_active, is_featured: p.is_featured, is_new_arrival: p.is_new_arrival, is_best_seller: p.is_best_seller, is_luxury: p.is_luxury,
        seo_title: p.seo_title ?? null, seo_description: p.seo_description ?? null,
      },
      p_images: p.images.map((i) => ({ id: i.id ?? null, storage_path: i.storage_path, alt: i.alt ?? null })),
      p_variants: p.variants.map((v) => ({ id: v.id ?? null, size_id: v.size_id, color_id: v.color_id || null, sku: v.sku, stock: v.stock, is_active: v.is_active })),
    });
    if (error) return fail(dbMessage(error));
    // The hanger refers to products by slug, so a rename or hide must refresh it too.
    ["products", "collections", "hanger"].forEach((t) => updateTag(t));
    return { ok: true, message: p.id ? "Product saved." : "Product created.", data: { id: data as string } };
  });
}

export async function setProductActive(id: string, active: boolean) {
  return adminAction(async ({ db }) => {
    if (!uuid.safeParse(id).success) return fail("Unknown product.");
    const { error, count } = await db.from("products").update({ is_active: active }, { count: "exact" }).eq("id", id);
    if (error) return fail(dbMessage(error));
    if (!count) return fail(GONE);
    updateTag("products");
    updateTag("hanger");
    return { ok: true, message: active ? "Product is now visible in the store." : "Product hidden from the store." };
  });
}

export async function deleteProduct(id: string) {
  return adminAction(async ({ db }) => {
    if (!uuid.safeParse(id).success) return fail("Unknown product.");
    const [{ data: images }, { data: hanger }] = await Promise.all([
      db.from("product_images").select("storage_path").eq("product_id", id),
      db.from("hanger_items").select("image_path, back_image_path").eq("product_id", id),
    ]);
    const { error, count } = await db.from("products").delete({ count: "exact" }).eq("id", id);
    if (error) return fail(dbMessage(error));
    if (!count) return fail("That product no longer exists.");
    // Past orders keep their own copy of the name, price and photo path, so a photo an order still
    // shows is kept; any other uploaded file of this product is removed.
    const uploaded = [...(images ?? []).map((i) => i.storage_path), ...(hanger ?? []).flatMap((h) => [h.image_path, h.back_image_path])]
      .filter((p): p is string => Boolean(p && !p.startsWith("https://")));
    if (uploaded.length) {
      const { data: ordered } = await db.from("order_items").select("image_path").in("image_path", uploaded);
      const keep = new Set((ordered ?? []).map((o) => o.image_path));
      const unused = [...new Set(uploaded)].filter((p) => !keep.has(p));
      if (unused.length) await db.storage.from("catalog").remove(unused);
    }
    ["products", "collections", "hanger"].forEach((t) => updateTag(t));
    return { ok: true, message: "Product deleted. Past orders keep their details." };
  });
}

const MAX_BYTES = 5 * 1024 * 1024;

/** Detects the real image type from the file's first bytes (never trusts the name or browser type). */
function sniff(bytes: Uint8Array): { ext: string; type: string } | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return { ext: "png", type: "image/png" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { ext: "webp", type: "image/webp" };
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) return { ext: "avif", type: "image/avif" };
  return null;
}

/** Uploads one catalogue image (products, categories, banners or logo) to Supabase Storage. */
export async function uploadCatalogImage(formData: FormData) {
  return adminAction<{ path: string; url: string }>(async ({ db }) => {
    const file = formData.get("file");
    const folder = String(formData.get("folder") ?? "products");
    if (!["products", "categories", "banners", "hanger", "branding"].includes(folder)) return fail("Unknown upload folder.");
    if (!(file instanceof File) || file.size === 0) return fail("Choose an image to upload.");
    if (file.size > MAX_BYTES) return fail("Images must be 5 MB or smaller.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniff(bytes);
    if (!kind) return fail("Only JPEG, PNG, WebP or AVIF images can be uploaded.");

    const path = `${folder}/${new Date().getFullYear()}/${crypto.randomUUID()}.${kind.ext}`;
    const { error } = await db.storage.from("catalog").upload(path, bytes, { contentType: kind.type, cacheControl: "31536000", upsert: false });
    if (error) return fail(`Upload failed: ${error.message}`);
    return { ok: true, message: "Image uploaded.", data: { path, url: imageUrl(path) } };
  });
}
