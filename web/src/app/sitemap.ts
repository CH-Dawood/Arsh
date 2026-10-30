import type { MetadataRoute } from "next";
import { getBrands, getCollections, getProductSlugs } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, collections, brands] = await Promise.all([getProductSlugs(), getCollections(), getBrands()]);
  const pages = ["/", "/shop", "/brands", "/about", "/contact", "/faqs", "/size-guide", "/shipping-policy", "/refund-policy", "/privacy-policy", "/terms"];
  return [
    ...pages.map((p) => ({ url: absoluteUrl(p), changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.5 })),
    ...collections.map((c) => ({ url: absoluteUrl(`/collections/${c.slug}`), changeFrequency: "daily" as const, priority: 0.8 })),
    ...brands.map((b) => ({ url: absoluteUrl(`/brands/${b.slug}`), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...slugs.map((s) => ({ url: absoluteUrl(`/products/${s}`), changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
