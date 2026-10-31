"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Price } from "@/components/ui/price";
import { MAX_PER_LINE, useCart, type CartLine } from "@/lib/store/cart";
import { QuantityStepper } from "./quantity";

export function CartLines({ lines, onNavigate, compact = false }: { lines: CartLine[]; onNavigate?: () => void; compact?: boolean }) {
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);

  return (
    <ul className="divide-y divide-hairline">
      <AnimatePresence initial={false}>
        {lines.map((l) => (
          <motion.li
            key={l.variantId}
            layout="position"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: 24 }}
            className="flex gap-4 py-5"
          >
            <Link href={`/products/${l.slug}`} onClick={onNavigate} className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden bg-champagne sm:w-24">
              {l.image && <Image src={l.image} alt={l.name} fill sizes="96px" className="object-cover" />}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/products/${l.slug}`} onClick={onNavigate} className="font-display text-lg leading-tight hover:text-gold-deep">
                    {l.name}
                  </Link>
                  <p className="mt-1 text-xs text-cocoa">Size: {l.sizeLabel}</p>
                </div>
                <Price price={l.price * l.quantity} compareAtPrice={l.compareAtPrice ? l.compareAtPrice * l.quantity : null} className="shrink-0 flex-col items-end text-sm" />
              </div>
              <div className="mt-auto flex items-center justify-between pt-3">
                <QuantityStepper
                  size={compact ? "sm" : "md"}
                  value={l.quantity}
                  max={Math.min(l.maxQuantity, MAX_PER_LINE)}
                  onChange={(n) => setQuantity(l.variantId, n)}
                  label={l.name}
                />
                <button type="button" onClick={() => remove(l.variantId)} className="text-xs text-cocoa underline underline-offset-4 hover:text-danger">
                  Remove
                </button>
              </div>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
