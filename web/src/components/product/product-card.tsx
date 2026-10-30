"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye } from "lucide-react";
import { useState } from "react";
import { Tilt } from "@/components/motion/tilt";
import { Price } from "@/components/ui/price";
import type { ProductSummary } from "@/lib/catalog/types";
import { cn } from "@/lib/format";
import { useCart } from "@/lib/store/cart";
import { ProductBadges } from "./badges";
import { QuickView } from "./quick-view";
import { WishlistButton } from "./wishlist-button";

export const CARD_SIZES = "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw";

export function ProductCard({ product, priority = false }: { product: ProductSummary; priority?: boolean }) {
  const [quickView, setQuickView] = useState(false);
  const add = useCart((s) => s.add);
  const [primary, secondary] = product.images;
  const href = `/products/${product.slug}`;
  const soldOut = !product.inStock;

  const quickAdd = (variantId: string) => {
    const s = product.sizes.find((x) => x.variantId === variantId)!;
    add({
      variantId, slug: product.slug, name: product.name, image: primary?.url ?? "", sizeLabel: s.label,
      price: product.price, compareAtPrice: product.compareAtPrice, maxQuantity: s.stock,
    });
  };

  return (
    <article className="group relative">
      <Tilt className="relative transition-shadow duration-700 ease-luxe group-hover:shadow-lift">
        <Link href={href} className="relative block aspect-[3/4] overflow-hidden bg-champagne" tabIndex={-1} aria-hidden>
          {primary && (
            <Image
              src={primary.url}
              alt=""
              fill
              sizes={CARD_SIZES}
              priority={priority}
              className={cn(
                "object-cover transition-[transform,opacity] duration-[1.2s] ease-luxe group-hover:scale-[1.04]",
                secondary && "group-hover:opacity-0",
              )}
            />
          )}
          {secondary && (
            <Image
              src={secondary.url}
              alt=""
              fill
              sizes={CARD_SIZES}
              className="scale-[1.06] object-cover opacity-0 transition-[transform,opacity] duration-[1.2s] ease-luxe group-hover:scale-100 group-hover:opacity-100"
            />
          )}
        </Link>

        <ProductBadges badges={product.badges} price={product.price} compareAtPrice={product.compareAtPrice} soldOut={soldOut} className="pointer-events-none absolute left-3 top-3" />

        <WishlistButton slug={product.slug} name={product.name} className="absolute right-2 top-2 z-10 size-10 rounded-full bg-ivory/80 backdrop-blur-sm hover:bg-ivory" />

        {/* Desktop hover / keyboard-focus panel: quick add by size, or quick view. */}
        <div className="absolute inset-x-3 bottom-3 hidden translate-y-3 bg-ivory/95 p-3 opacity-0 backdrop-blur-sm transition-[transform,opacity] duration-500 ease-luxe group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 lg:block">
          {!soldOut && (
            <>
              <p className="label mb-2 text-center text-[0.625rem] text-cocoa">Quick add</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {product.sizes.map((s) => (
                  <button
                    key={s.variantId}
                    type="button"
                    disabled={s.stock === 0}
                    onClick={() => quickAdd(s.variantId)}
                    aria-label={`Add ${product.name}, size ${s.label}, to bag`}
                    className="h-9 min-w-9 border border-hairline px-2 text-xs transition-colors hover:border-espresso hover:bg-espresso hover:text-ivory disabled:text-taupe disabled:line-through disabled:hover:border-hairline disabled:hover:bg-transparent"
                  >
                    {s.code === "UNSTITCHED" ? "Add to bag" : s.code}
                  </button>
                ))}
              </div>
            </>
          )}
          <button type="button" onClick={() => setQuickView(true)} className="label mt-2 flex w-full items-center justify-center gap-2 pt-1 text-[0.625rem] hover:text-gold-deep">
            <Eye className="size-3.5" strokeWidth={1.5} aria-hidden /> Quick view
          </button>
        </div>
      </Tilt>

      <div className="mt-4 space-y-1.5">
        {product.brand && <p className="label text-[0.625rem] text-cocoa">{product.brand.name}</p>}
        <h3 className="font-display text-lg leading-snug sm:text-xl">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] lg:after:hidden hover:text-gold-deep">
            {product.name}
          </Link>
        </h3>
        <Price price={product.price} compareAtPrice={product.compareAtPrice} className="text-sm" />
        <p className="text-xs tracking-wide text-cocoa">
          <span className="sr-only">Sizes: </span>
          {product.sizes.map((s, i) => (
            <span key={s.variantId} className={cn(s.stock === 0 && "text-taupe line-through")}>
              {i > 0 && " · "}{s.code === "UNSTITCHED" ? "Unstitched" : s.code}
            </span>
          ))}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setQuickView(true)}
        className="label relative z-10 mt-3 w-full border border-hairline py-3 text-[0.625rem] transition-colors hover:border-espresso lg:hidden"
        disabled={soldOut}
      >
        {soldOut ? "Sold out" : "Add to bag"}
      </button>

      <QuickView product={product} open={quickView} onClose={() => setQuickView(false)} />
    </article>
  );
}
