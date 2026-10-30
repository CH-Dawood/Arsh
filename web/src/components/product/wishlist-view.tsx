"use client";

import { Heart } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import type { ProductSummary } from "@/lib/catalog/types";
import { useHydrated } from "@/lib/hooks";
import { useWishlist } from "@/lib/store/wishlist";
import { ProductCard } from "./product-card";

export function WishlistView({ products }: { products: ProductSummary[] }) {
  const hydrated = useHydrated();
  const slugs = useWishlist((s) => s.slugs);
  if (!hydrated) return <div className="h-64 animate-pulse bg-linen" aria-busy="true" />;

  const saved = slugs.map((s) => products.find((p) => p.slug === s)).filter((p): p is ProductSummary => Boolean(p));
  if (!saved.length) {
    return (
      <div className="flex flex-col items-center gap-5 py-20 text-center">
        <Heart className="size-12 text-taupe" strokeWidth={1} aria-hidden />
        <p className="font-display text-3xl">Nothing saved yet</p>
        <p className="text-cocoa">Tap the heart on any piece to save it here.</p>
        <ButtonLink href="/collections/new-arrivals">Discover new arrivals</ButtonLink>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
      {saved.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}
    </ul>
  );
}
