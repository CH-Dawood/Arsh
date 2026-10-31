"use client";

import { useEffect, useState } from "react";
import { refreshOrder, type TrackedOrder } from "@/lib/actions/orders";
import { OrderStatus } from "./order-status";

const POLL_MS = 30_000;
const FINAL = new Set(["delivered", "cancelled", "returned"]);

/** Re-checks the order every 30s while the tab is visible, and stops once the order is final. */
export function LiveOrderStatus({ initial, phone }: { initial: TrackedOrder; phone?: string }) {
  const [order, setOrder] = useState(initial);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const live = !FINAL.has(order.status);

  useEffect(() => {
    if (!live) return;
    let busy = false;
    const tick = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const next = await refreshOrder(order.order_number, phone);
        if (next) {
          setOrder(next);
          setCheckedAt(new Date());
        }
      } finally {
        busy = false;
      }
    };
    const id = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [live, order.order_number, phone]);

  return (
    <div>
      {live && (
        <p className="mb-6 flex items-center gap-2 text-xs text-cocoa" aria-live="polite">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          Live: this page updates when your order moves
          {checkedAt && ` · checked ${checkedAt.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })}`}
        </p>
      )}
      <OrderStatus order={order} />
    </div>
  );
}
