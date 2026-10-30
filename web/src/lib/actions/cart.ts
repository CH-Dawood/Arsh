"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/admin";

export interface LiveVariant {
  variantId: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Current price and stock for the variants in a browser bag. Variants that were removed,
 * deactivated or never existed are simply absent from the result. Returns null in demo mode.
 */
export async function syncCart(variantIds: string[]): Promise<LiveVariant[] | null> {
  if (!isSupabaseConfigured) return null;
  const ids = [...new Set(variantIds.filter((id) => UUID.test(id)))].slice(0, 50);
  if (!ids.length) return [];

  const { data, error } = await createPublicClient()
    .from("product_variants")
    .select("id, stock, price_override, product:products!inner(base_price, compare_at_price)")
    .in("id", ids);
  if (error) return null; // keep the bag untouched rather than emptying it on a transient error

  return (data ?? []).map((v) => {
    const product = v.product as { base_price: number; compare_at_price: number | null };
    return { variantId: v.id, price: v.price_override ?? product.base_price, compareAtPrice: product.compare_at_price, stock: v.stock };
  });
}
