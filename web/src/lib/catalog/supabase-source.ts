import "server-only";
import { env } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/admin";
import { PAGE_SIZE, toSummary, type CatalogSource } from "./source";
import type { Badge, Collection, HomeSectionKind, Product, ProductQuery } from "./types";

/** Catalogue images are either Supabase Storage paths (bucket "catalog") or absolute https URLs. */
export const imageUrl = (path: string) =>
  path.startsWith("https://") ? path : `${env.supabaseUrl}/storage/v1/object/public/catalog/${path.replace(/^\/+/, "")}`;

const PRODUCT_FIELDS = `id, slug, name, short_description, description, fabric, embroidery, care_instructions, piece_count,
  base_price, compare_at_price, is_new_arrival, is_best_seller, is_luxury, is_featured, created_at,
  images:product_images(storage_path, alt, sort_order),
  variants:product_variants(id, sku, stock, price_override, is_active, size:sizes(code, label, sort_order), color:colors(name))`;

const select = ({ categoryInner = false, brandInner = false } = {}) =>
  `${PRODUCT_FIELDS}, category:categories${categoryInner ? "!inner" : ""}(name, slug), brand:brands${brandInner ? "!inner" : ""}(name, slug, is_featured)`;

type ProductRow = {
  id: string; slug: string; name: string; short_description: string | null; description: string | null;
  fabric: string | null; embroidery: string | null; care_instructions: string | null; piece_count: number | null;
  base_price: number; compare_at_price: number | null; is_new_arrival: boolean; is_best_seller: boolean; is_luxury: boolean;
  is_featured: boolean; created_at: string;
  images: { storage_path: string; alt: string | null; sort_order: number }[];
  variants: { id: string; sku: string; stock: number; price_override: number | null; is_active: boolean;
    size: { code: string; label: string; sort_order: number }; color: { name: string } | null }[];
  category: { name: string; slug: string };
  brand: { name: string; slug: string; is_featured: boolean } | null;
};

function toProduct(r: ProductRow): Product {
  const variants = r.variants
    .filter((v) => v.is_active)
    .sort((a, b) => a.size.sort_order - b.size.sort_order)
    .map((v) => ({
      id: v.id, sku: v.sku, size: { code: v.size.code, label: v.size.label },
      color: v.color?.name ?? null, stock: v.stock, price: v.price_override ?? r.base_price,
    }));
  const badges: Badge[] = [
    ...(r.is_new_arrival ? (["new"] as const) : []),
    ...(r.is_best_seller ? (["bestseller"] as const) : []),
    ...(r.is_luxury ? (["luxury"] as const) : []),
    ...(r.compare_at_price ? (["sale"] as const) : []),
  ];
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    price: r.base_price,
    compareAtPrice: r.compare_at_price,
    images: [...r.images].sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ url: imageUrl(i.storage_path), alt: i.alt ?? r.name })),
    sizes: variants.map((v) => ({ variantId: v.id, code: v.size.code, label: v.size.label, stock: v.stock })),
    badges,
    brand: r.brand ? { name: r.brand.name, slug: r.brand.slug } : null,
    category: { name: r.category.name, slug: r.category.slug },
    inStock: variants.some((v) => v.stock > 0),
    createdAt: r.created_at,
    featured: r.is_featured,
    shortDescription: r.short_description ?? "",
    description: r.description ?? r.short_description ?? "",
    fabric: r.fabric,
    embroidery: r.embroidery,
    care: r.care_instructions,
    pieceCount: r.piece_count,
    variants,
  };
}

const defaultDescription: Record<HomeSectionKind, string> = {
  new_arrivals: "The latest pieces, fresh from the studio.",
  luxury: "Couture for weddings and celebrations.",
  best_sellers: "The pieces our customers love most.",
  brands: "Our labels, from prêt to couture.",
  category: "",
};

const db = () => createPublicClient();
const fail = (error: { message: string } | null) => {
  if (error) throw new Error(`Catalogue query failed: ${error.message}`);
};

async function collectionsQuery(): Promise<Collection[]> {
  const { data, error } = await db()
    .from("home_sections")
    .select("title, slug, kind, image_path, category:categories(slug, description, image_path)")
    .order("sort_order");
  fail(error);
  // A tile whose category is hidden comes back without it (RLS); leave that tile out instead of showing every product.
  return (data ?? []).filter((s) => s.kind !== "category" || s.category).map((s) => {
    const category = s.category as { slug: string; description: string | null; image_path: string | null } | null;
    // A category tile uses its own image, falling back to the category's image from the admin.
    const path = s.image_path ?? category?.image_path ?? null;
    return {
      slug: s.slug, title: s.title, kind: s.kind, categorySlug: category?.slug ?? null,
      description: category?.description || defaultDescription[s.kind],
      image: path ? { url: imageUrl(path), alt: s.title } : null,
    };
  });
}

async function productsQuery({ collection, category, brand, size, sort = "newest", page = 1, pageSize = PAGE_SIZE }: ProductQuery) {
  const col = collection ? (await collectionsQuery()).find((c) => c.slug === collection) : undefined;
  if (collection && !col) return { items: [], total: 0, page: 1, pageCount: 1 };
  const categorySlug = category ?? (col?.kind === "category" ? col.categorySlug : null);

  // Size filter: products with that size in stock (variant filters would otherwise trim the embedded rows).
  let sizeIds: string[] | null = null;
  if (size) {
    const { data, error } = await db().from("product_variants").select("product_id, size:sizes!inner(code)").eq("size.code", size).gt("stock", 0);
    fail(error);
    sizeIds = [...new Set((data ?? []).map((v) => v.product_id))];
    if (!sizeIds.length) return { items: [], total: 0, page: 1, pageCount: 1 };
  }

  const run = async (p: number) => {
    let q = db()
      .from("products")
      .select(select({ categoryInner: Boolean(categorySlug), brandInner: Boolean(brand) || col?.kind === "brands" }), { count: "exact" })
      .eq("is_active", true);
    if (col?.kind === "new_arrivals") q = q.eq("is_new_arrival", true);
    if (col?.kind === "luxury") q = q.eq("is_luxury", true);
    if (col?.kind === "best_sellers") q = q.eq("is_best_seller", true);
    if (col?.kind === "brands") q = q.eq("brand.is_featured", true);
    if (categorySlug) q = q.eq("category.slug", categorySlug);
    if (brand) q = q.eq("brand.slug", brand);
    if (sizeIds) q = q.in("id", sizeIds);
    q = sort === "newest"
      ? q.order("created_at", { ascending: false })
      : q.order("base_price", { ascending: sort === "price-asc" }).order("created_at", { ascending: false });
    const from = (p - 1) * pageSize;
    return q.range(from, from + pageSize - 1);
  };

  let current = Math.max(1, page);
  const first = await run(current);
  let { data, error } = first;
  fail(error);
  const total = first.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (current > pageCount) {
    current = pageCount;
    ({ data, error } = await run(current));
    fail(error);
  }
  return { items: ((data ?? []) as unknown as ProductRow[]).map((r) => toSummary(toProduct(r))), total, page: current, pageCount };
}

async function productsByIds(ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await db().from("products").select(select()).in("id", ids);
  fail(error);
  const byId = new Map(((data ?? []) as unknown as ProductRow[]).map((r) => [r.id, toProduct(r)]));
  return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
}

export const supabaseSource: CatalogSource = {
  async settings() {
    const { data: s, error } = await db().from("store_settings").select("*").eq("id", 1).single();
    fail(error);
    return {
      storeName: s!.store_name, tagline: s!.tagline, contactEmail: s!.contact_email, contactPhone: s!.contact_phone,
      address: s!.address, whatsappNumber: s!.whatsapp_number, whatsappMessage: s!.whatsapp_message,
      instagramUrl: s!.instagram_url, tiktokUrl: s!.tiktok_url, facebookUrl: s!.facebook_url,
      freeShippingThreshold: s!.free_shipping_threshold, shippingFee: s!.shipping_fee,
      codEnabled: s!.cod_enabled, bankTransferEnabled: s!.bank_transfer_enabled,
      logoUrl: s!.logo_path ? imageUrl(s!.logo_path) : null,
      storeOpen: s!.store_open, closedMessage: s!.closed_message,
    };
  },

  async banners() {
    // RLS returns only active banners inside their optional start/end dates.
    const { data, error } = await db().from("banners")
      .select("id, heading, subheading, promo_text, cta_label, cta_href, image_path, mobile_image_path, alt")
      .order("sort_order").order("created_at");
    fail(error);
    return (data ?? []).map((b) => ({
      id: b.id, heading: b.heading, subheading: b.subheading, promoText: b.promo_text,
      ctaLabel: b.cta_label, ctaHref: b.cta_href, image: { url: imageUrl(b.image_path), alt: b.alt },
      mobileImage: b.mobile_image_path ? { url: imageUrl(b.mobile_image_path), alt: b.alt } : null,
    }));
  },

  async hanger() {
    const [{ data: s, error }, { data: rows, error: itemsError }] = await Promise.all([
      db().from("hanger_settings").select("*, featured:hanger_items(product_id)").eq("id", 1).maybeSingle(),
      // Inactive products are hidden by RLS, so their pieces come back without a product and are dropped.
      db().from("hanger_items").select("product_id, image_path, back_image_path, title, description, product:products(slug)").order("sort_order"),
    ]);
    fail(error ?? itemsError);
    if (!s) return null;
    return {
      enabled: s.is_enabled, eyebrow: s.eyebrow, heading: s.heading, subtitle: s.subtitle, caption: s.caption,
      ctaLabel: s.cta_label, ctaHref: s.cta_href, maxItems: s.max_items, autoplay: s.autoplay, interval: s.interval_ms,
      featuredProductId: (s.featured as { product_id: string } | null)?.product_id ?? null,
      items: (rows ?? []).flatMap((r) => {
        const product = r.product as { slug: string } | null;
        return product ? [{
          productId: r.product_id, slug: product.slug, title: r.title, description: r.description,
          image: r.image_path ? imageUrl(r.image_path) : null, backImage: r.back_image_path ? imageUrl(r.back_image_path) : null,
        }] : [];
      }),
    };
  },

  collections: collectionsQuery,

  async categories() {
    const { data, error } = await db().from("categories").select("name, slug, description, image_path").order("sort_order");
    fail(error);
    return (data ?? []).map((c) => ({ name: c.name, slug: c.slug, description: c.description, image: c.image_path ? { url: imageUrl(c.image_path), alt: c.name } : null }));
  },

  async brands() {
    const { data, error } = await db().from("brands").select("name, slug, description, is_featured").order("sort_order").order("name");
    fail(error);
    return (data ?? []).map((b) => ({ name: b.name, slug: b.slug, description: b.description, isFeatured: b.is_featured }));
  },

  products: productsQuery,

  async product(slug) {
    const { data, error } = await db().from("products").select(select()).eq("slug", slug).maybeSingle();
    fail(error);
    return data ? toProduct(data as unknown as ProductRow) : null;
  },

  async productSlugs() {
    const { data, error } = await db().from("products").select("slug").order("created_at", { ascending: false }).limit(1000);
    fail(error);
    return (data ?? []).map((p) => p.slug);
  },

  async related(slug, limit) {
    const product = await this.product(slug);
    if (!product) return [];
    const [same, recent] = await Promise.all([
      productsQuery({ category: product.category.slug, pageSize: limit + 1 }),
      productsQuery({ pageSize: limit + 1 }),
    ]);
    const seen = new Set([slug]);
    return [...same.items, ...recent.items].filter((p) => !seen.has(p.slug) && seen.add(p.slug)).slice(0, limit);
  },

  async search(q, limit) {
    const { data, error } = await db().rpc("search_products", { p_query: q.slice(0, 100), p_limit: limit });
    fail(error);
    return (await productsByIds((data ?? []).map((p: { id: string }) => p.id))).map(toSummary);
  },

  async contentPage(slug) {
    const { data, error } = await db().from("content_pages").select("slug, title, body").eq("slug", slug).maybeSingle();
    fail(error);
    return data;
  },

  async faqs() {
    const { data, error } = await db().from("faq_items").select("id, question, answer").order("sort_order");
    fail(error);
    return data ?? [];
  },
};
