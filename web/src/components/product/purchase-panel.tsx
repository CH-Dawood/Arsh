"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, Ruler } from "lucide-react";
import { useState } from "react";
import { QuantityStepper } from "@/components/cart/quantity";
import { Button } from "@/components/ui/button";
import type { SizeOption } from "@/lib/catalog/types";
import { cn } from "@/lib/format";
import { MAX_PER_LINE, useCart } from "@/lib/store/cart";
import { WishlistButton } from "./wishlist-button";

export interface Purchasable {
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  sizes: SizeOption[];
}

export function PurchasePanel({ product, onDone, onSizeGuide }: {
  product: Purchasable;
  onDone?: () => void;
  onSizeGuide?: () => void;
}) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const setCartOpen = useCart((s) => s.setOpen);
  const single = product.sizes.length === 1 ? product.sizes[0] : null;
  const [variantId, setVariantId] = useState<string | null>(single && single.stock > 0 ? single.variantId : null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  const selected = product.sizes.find((s) => s.variantId === variantId);
  const soldOut = product.sizes.every((s) => s.stock === 0);
  const max = Math.min(selected?.stock ?? MAX_PER_LINE, MAX_PER_LINE);

  const addToBag = (checkout: boolean) => {
    if (!selected) return setError("Please select a size.");
    add(
      {
        variantId: selected.variantId, slug: product.slug, name: product.name, image: product.image,
        sizeLabel: selected.label, price: product.price, compareAtPrice: product.compareAtPrice, maxQuantity: selected.stock,
      },
      Math.min(quantity, max),
    );
    onDone?.();
    if (checkout) {
      setCartOpen(false);
      router.push("/checkout");
    } else {
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    }
  };

  return (
    <div className="space-y-6">
      {!single && (
        <fieldset>
          <div className="flex items-center justify-between">
            <legend className="label">
              Size{selected && <span className="ml-2 normal-case tracking-normal text-cocoa">{selected.label}</span>}
            </legend>
            {onSizeGuide && (
              <button type="button" onClick={onSizeGuide} className="flex items-center gap-1.5 text-xs underline underline-offset-4 hover:text-gold-deep">
                <Ruler className="size-3.5" strokeWidth={1.5} aria-hidden /> Size guide
              </button>
            )}
          </div>
          <div role="radiogroup" aria-label="Size" className="mt-3 flex flex-wrap gap-2">
            {product.sizes.map((s) => {
              const checked = s.variantId === variantId;
              const out = s.stock === 0;
              return (
                <button
                  key={s.variantId}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-label={`${s.label}${out ? ", sold out" : ""}`}
                  disabled={out}
                  onClick={() => { setVariantId(s.variantId); setError(""); setQuantity(1); }}
                  className={cn(
                    "relative h-11 min-w-12 border px-3 text-sm transition-colors duration-300",
                    checked ? "border-espresso bg-espresso text-ivory" : "border-hairline hover:border-espresso",
                    out && "cursor-not-allowed text-taupe line-through decoration-taupe",
                  )}
                >
                  {s.code}
                </button>
              );
            })}
          </div>
          <p role="alert" className="mt-2 min-h-5 text-sm text-danger">{error}</p>
          {selected && selected.stock <= 3 && <p className="text-sm text-gold-deep">Only {selected.stock} left in this size</p>}
        </fieldset>
      )}
      {single && <p className="text-sm text-cocoa">Size: {single.label}</p>}

      <div className="flex flex-wrap items-stretch gap-3">
        <QuantityStepper value={quantity} max={max} onChange={(n) => setQuantity(Math.max(1, Math.min(n, max)))} label={product.name} />
        <Button size="lg" className="min-w-48 flex-1" disabled={soldOut} onClick={() => addToBag(false)}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={added ? "added" : "add"}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              {soldOut ? "Sold out" : added ? <><Check className="size-4" aria-hidden /> Added to bag</> : "Add to bag"}
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" size="lg" className="flex-1" disabled={soldOut} onClick={() => addToBag(true)}>Buy now</Button>
        <WishlistButton slug={product.slug} name={product.name} className="size-14 shrink-0 border border-hairline hover:border-espresso" />
      </div>
      <p className="sr-only" aria-live="polite">{added ? `${product.name} added to your bag` : ""}</p>
    </div>
  );
}
