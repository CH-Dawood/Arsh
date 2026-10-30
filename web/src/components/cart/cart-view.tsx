"use client";

import { ShoppingBag } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { formatPKR } from "@/lib/format";
import { useHydrated } from "@/lib/hooks";
import { cartSubtotal, useCart } from "@/lib/store/cart";
import { CartLines } from "./cart-lines";
import { ShippingProgress } from "./shipping-progress";

export function CartView({ freeShippingThreshold, shippingFee }: { freeShippingThreshold: number; shippingFee: number }) {
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  if (!hydrated) return <div className="h-64 animate-pulse bg-linen" aria-busy="true" />;

  if (!lines.length) {
    return (
      <div className="flex flex-col items-center gap-5 py-20 text-center">
        <ShoppingBag className="size-12 text-taupe" strokeWidth={1} aria-hidden />
        <p className="font-display text-3xl">Your bag is empty</p>
        <ButtonLink href="/shop">Continue shopping</ButtonLink>
      </div>
    );
  }

  const subtotal = cartSubtotal(lines);
  const shipping = subtotal >= freeShippingThreshold ? 0 : shippingFee;

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-label="Items in your bag" className="border-t border-hairline">
        <CartLines lines={lines} />
      </section>
      <aside className="h-fit space-y-5 bg-linen p-6 lg:sticky lg:top-32 sm:p-8">
        <h2 className="text-2xl">Order summary</h2>
        <ShippingProgress subtotal={subtotal} threshold={freeShippingThreshold} />
        <dl className="space-y-3 border-t border-hairline pt-5 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPKR(subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping ? formatPKR(shipping) : "Free"}</dd></div>
          <div className="flex justify-between border-t border-hairline pt-3 text-base font-medium"><dt>Estimated total</dt><dd>{formatPKR(subtotal + shipping)}</dd></div>
        </dl>
        <p className="text-xs text-cocoa">Discount codes are applied at checkout. Final prices are confirmed when you place your order.</p>
        <ButtonLink href="/checkout" size="lg" className="w-full">Proceed to checkout</ButtonLink>
        <ButtonLink href="/shop" variant="ghost" className="w-full justify-center">Continue shopping</ButtonLink>
      </aside>
    </div>
  );
}
