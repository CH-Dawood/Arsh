"use client";

import { ShoppingBag } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { formatPKR } from "@/lib/format";
import { useHydrated } from "@/lib/hooks";
import { cartCount, cartSubtotal, useCart } from "@/lib/store/cart";
import { CartLines } from "./cart-lines";
import { ShippingProgress } from "./shipping-progress";

export function CartDrawer({ freeShippingThreshold }: { freeShippingThreshold: number }) {
  const hydrated = useHydrated();
  const { lines, isOpen, setOpen } = useCart();
  const close = () => setOpen(false);
  const subtotal = cartSubtotal(lines);

  return (
    <Sheet open={hydrated && isOpen} onClose={close} side="right" label="Shopping bag">
      <div className="border-b border-hairline px-6 pb-5 pt-6">
        <h2 className="text-2xl">Your bag <span className="text-base text-cocoa">({cartCount(lines)})</span></h2>
        {lines.length > 0 && <div className="mt-5"><ShippingProgress subtotal={subtotal} threshold={freeShippingThreshold} /></div>}
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <ShoppingBag className="size-10 text-taupe" strokeWidth={1} aria-hidden />
          <p className="font-display text-2xl">Your bag is empty</p>
          <ButtonLink href="/collections/new-arrivals" onClick={close} data-autofocus>Discover new arrivals</ButtonLink>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-6"><CartLines lines={lines} onNavigate={close} compact /></div>
          <div className="space-y-4 border-t border-hairline bg-linen px-6 py-5">
            <div className="flex justify-between">
              <span className="label">Estimated subtotal</span>
              <span>{formatPKR(subtotal)}</span>
            </div>
            <p className="text-xs text-cocoa">Shipping and discount codes are applied at checkout.</p>
            <div className="grid gap-3">
              <ButtonLink href="/checkout" onClick={close} size="lg" data-autofocus>Checkout</ButtonLink>
              <ButtonLink href="/cart" onClick={close} variant="outline">View bag</ButtonLink>
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}
