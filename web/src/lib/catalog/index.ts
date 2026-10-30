import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { isSupabaseConfigured } from "@/lib/env";
import {
  demoBanners, demoBrands, demoCategories, demoCollections, demoFaqs, demoPages, demoProducts, demoSettings,
} from "./demo";
import type { Collection, Product, ProductQuery, ProductSummary } from "./types";

/**
 * Catalogue read API used by every page. It serves the demo catalogue until Supabase is
 * connected; Phase 3 swaps each body for a Supabase query with the same signature.
 */
export const isDemoCatalog = !isSupabaseConfigured;

const PAGE_SIZE = 24;

const toSummary = ({ id, slug, name, price, compareAtPrice, images, sizes, badges, brand, category, inStock, createdAt }: Product): ProductSummary =>
  ({ id, slug, name, price, compareAtPrice, images: images.slice(0, 2), sizes, badges, brand, category, inStock, createdAt });

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

export async function getSettings() {
  "use cache";
  cacheLife("hours");
  cacheTag("settings");
  return demoSettings;
}

export async function getBanners() {
  "use cache";
  cacheLife("hours");
  cacheTag("banners");
  return demoBanners;
}

export async function getCollections() {
  "use cache";
  cacheLife("hours");
  cacheTag("collections");
  return demoCollections;
}

export async function getCollection(slug: string) {
  return (await getCollections()).find((c) => c.slug === slug) ?? null;
}

export async function getCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");
  return demoCategories;
}

export async function getBrands() {
  "use cache";
  cacheLife("hours");
  cacheTag("brands");
  return demoBrands;
}

export async function getProducts(query: ProductQuery = {}) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const { collection, category, brand, size, sort = "newest", page = 1, pageSize = PAGE_SIZE } = query;
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
  return {
    items: matches.slice((current - 1) * pageSize, current * pageSize).map(toSummary),
    total: matches.length,
    page: current,
    pageCount,
  };
}

export async function getProduct(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("products", `product:${slug}`);
  return demoProducts.find((p) => p.slug === slug) ?? null;
}

export async function getProductSlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  return demoProducts.map((p) => p.slug);
}

export async function getRelatedProducts(slug: string, limit = 4) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
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
}

/** Every term must match the product's name, fabric, embroidery, colour, category or brand. */
export async function searchProducts(q: string, limit = 24) {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  const terms = q.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 8);
  if (!terms.length) return [];
  return demoProducts
    .map((p) => {
      const name = p.name.toLowerCase();
      const haystack = [name, p.fabric, p.embroidery, p.category.name, p.brand?.name, p.variants[0]?.color]
        .join(" ").toLowerCase();
      const score = terms.every((t) => haystack.includes(t)) ? terms.filter((t) => name.includes(t)).length + 1 : 0;
      return { p, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || newestFirst(a.p, b.p))
    .slice(0, limit)
    .map((r) => toSummary(r.p));
}

export async function getContentPage(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("content", `content:${slug}`);
  return demoPages.find((p) => p.slug === slug) ?? null;
}

export async function getFaqs() {
  "use cache";
  cacheLife("hours");
  cacheTag("faqs");
  return demoFaqs;
}
