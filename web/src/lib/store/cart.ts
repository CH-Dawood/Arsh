"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const MAX_PER_LINE = 10;

/** Display snapshot only. The server re-prices every line from the database at checkout. */
export interface CartLine {
  variantId: string;
  slug: string;
  name: string;
  image: string;
  sizeLabel: string;
  price: number;
  compareAtPrice: number | null;
  maxQuantity: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  isOpen: boolean;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
}

const clampQty = (qty: number, max: number) => Math.max(1, Math.min(qty, max, MAX_PER_LINE));

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,
      add: (line, quantity = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => l.variantId === line.variantId);
          const lines = existing
            ? s.lines.map((l) => (l === existing ? { ...l, ...line, quantity: clampQty(l.quantity + quantity, line.maxQuantity) } : l))
            : [...s.lines, { ...line, quantity: clampQty(quantity, line.maxQuantity) }];
          return { lines, isOpen: true };
        }),
      setQuantity: (variantId, quantity) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.variantId === variantId ? { ...l, quantity: clampQty(quantity, l.maxQuantity) } : l)),
        })),
      remove: (variantId) => set((s) => ({ lines: s.lines.filter((l) => l.variantId !== variantId) })),
      clear: () => set({ lines: [] }),
      setOpen: (isOpen) => set({ isOpen }),
    }),
    {
      name: "cart",
      version: 1,
      // window.* so server rendering never touches Node's own experimental localStorage.
      storage: createJSONStorage(() => window.localStorage),
      partialize: (s) => ({ lines: s.lines }),
    },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.price * l.quantity, 0);
