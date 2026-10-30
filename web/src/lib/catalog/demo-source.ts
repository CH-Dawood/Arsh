import {
  demoBanners, demoBrands, demoCategories, demoCollections, demoFaqs, demoPages, demoProducts, demoSettings,
} from "./demo";
import { PAGE_SIZE, searchTerms, toSummary, type CatalogSource } from "./source";
import type { Collection, Product } from "./types";

/** In-memory catalogue used only when Supabase is not configured (e.g. a fresh clone). */
const newestFirst = (a: Product, b: Product) => b.createdAt.localeCompare(a.createdAt);

function inCollection(p: Product, c: Collection) {
  switch (c.kind) {
    case "new_arrivals": return p.badges.includes("new");
    case "luxury": return p.badges.includes("luxury");
    case "best_sellers": return p.badges.includes("bestseller");
    case "brands": return demoBrands.some((b) => b.isFeatured && b.slug === p.brand?.slug);
    case "category": return p.category.slug === c.categorySlug;
  }
}

export const demoSource: CatalogSource = {
  settings: async () => demoSettings,
  banners: async () => demoBanners,
  collections: async () => demoCollections,
  categories: async () => demoCategories,
  brands: async () => demoBrands,

  async products({ collection, category, brand, size, sort = "newest", page = 1, pageSize = PAGE_SIZE }) {
    const col = collection ? demoCollections.find((c) => c.slug === collection) : undefined;
    const matches = demoProducts
      .filter((p) =>
        (!col || inCollection(p, col)) &&
        (!category || p.category.slug === category) &&
        (!brand || p.brand?.slug === brand) &&
        (!size || p.sizes.some((s) => s.code === size && s.stock > 0)))
      .sort(sort === "price-asc" ? (a, b) => a.price - b.price : sort === "price-desc" ? (a, b) => b.price - a.price : newestFirst);
    const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
    const current = Math.min(Math.max(1, page), pageCount);
    return { items: matches.slice((current - 1) * pageSize, current * pageSize).map(toSummary), total: matches.length, page: current, pageCount };
  },

  product: async (slug) => demoProducts.find((p) => p.slug === slug) ?? null,
  productSlugs: async () => demoProducts.map((p) => p.slug),

  async related(slug, limit) {
    const product = demoProducts.find((p) => p.slug === slug);
    if (!product) return [];
    return demoProducts
      .filter((p) => p.slug !== slug)
      .sort((a, b) =>
        Number(b.category.slug === product.category.slug) - Number(a.category.slug === product.category.slug) ||
        Number(b.brand?.slug === product.brand?.slug) - Number(a.brand?.slug === product.brand?.slug) ||
        newestFirst(a, b))
      .slice(0, limit)
      .map(toSummary);
  },

  async search(q, limit) {
    const terms = searchTerms(q);
    if (!terms.length) return [];
    return demoProducts
      .map((p) => {
        const name = p.name.toLowerCase();
        const haystack = [name, p.fabric, p.embroidery, p.category.name, p.brand?.name, p.variants[0]?.color].join(" ").toLowerCase();
        return { p, score: terms.every((t) => haystack.includes(t)) ? terms.filter((t) => name.includes(t)).length + 1 : 0 };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || newestFirst(a.p, b.p))
      .slice(0, limit)
      .map((r) => toSummary(r.p));
  },

  contentPage: async (slug) => demoPages.find((p) => p.slug === slug) ?? null,
  faqs: async () => demoFaqs,
};
