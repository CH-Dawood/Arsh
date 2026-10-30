"use client";

import { useEffect } from "react";
import { syncCart } from "@/lib/actions/cart";
import { useCart } from "@/lib/store/cart";

/** Once per page load, aligns the browser bag with live prices and stock. Renders nothing. */
export function CartSync() {
  useEffect(() => {
    const run = () => {
      const ids = useCart.getState().lines.map((l) => l.variantId);
      if (!ids.length) return;
      syncCart(ids).then((live) => live && useCart.getState().reconcile(live)).catch(() => {});
    };
    // Wait for the persisted bag to load from localStorage before syncing.
    if (useCart.persist.hasHydrated()) run();
    else return useCart.persist.onFinishHydration(run);
  }, []);
  return null;
}

export function CartNotice() {
  const notice = useCart((s) => s.notice);
  return notice ? <p role="status" className="border border-gold/40 bg-champagne/50 px-4 py-3 text-sm">{notice}</p> : null;
}
