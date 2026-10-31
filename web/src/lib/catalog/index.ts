import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { isSupabaseConfigured } from "@/lib/env";
import { demoSource } from "./demo-source";
import type { CatalogSource } from "./source";
import { supabaseSource } from "./supabase-source";
import type { ProductQuery } from "./types";

/**
 * Cached catalogue read API used by every page. Reads Supabase when configured, otherwise the
 * offline demo catalogue. Admin writes expire these entries through the matching cache tags.
 */
export const isDemoCatalog = !isSupabaseConfigured;
const source: CatalogSource = isSupabaseConfigured ? supabaseSource : demoSource;

export async function getSettings() {
  "use cache";
  cacheLife("hours");
  cacheTag("settings");
  return source.settings();
}

export async function getBanners() {
  "use cache";
  cacheLife("hours");
  cacheTag("banners");
  return source.banners();
}

export async function getHanger() {
  "use cache";
  cacheLife("hours");
  cacheTag("hanger");
  return source.hanger();
}

export async function getCollections() {
  "use cache";
  cacheLife("hours");
  cacheTag("collections");
  return source.collections();
}

export async function getCollection(slug: string) {
  return (await getCollections()).find((c) => c.slug === slug) ?? null;
}

export async function getCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");
  return source.categories();
}

export async function getBrands() {
  "use cache";
  cacheLife("hours");
  cacheTag("brands");
  return source.brands();
}

// Product data carries stock, so it refreshes within minutes; checkout re-checks stock regardless.
export async function getProducts(query: ProductQuery = {}) {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  return source.products(query);
}

export async function getProduct(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("products", `product:${slug}`);
  return source.product(slug);
}

export async function getProductSlugs() {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  return source.productSlugs();
}

export async function getRelatedProducts(slug: string, limit = 4) {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  return source.related(slug, limit);
}

export async function searchProducts(q: string, limit = 24) {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  return source.search(q, limit);
}

export async function getContentPage(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("content", `content:${slug}`);
  return source.contentPage(slug);
}

export async function getFaqs() {
  "use cache";
  cacheLife("hours");
  cacheTag("faqs");
  return source.faqs();
}
