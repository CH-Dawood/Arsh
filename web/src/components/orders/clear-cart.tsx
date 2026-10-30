"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/store/cart";

/** Empties the browser bag once an order is confirmed by the server. */
export function ClearCart() {
  const clear = useCart((s) => s.clear);
  useEffect(() => clear(), [clear]);
  return null;
}
