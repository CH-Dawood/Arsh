// Shared order vocabulary for the admin dashboard and the customer tracking page.

export const ORDER_STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"] as const;
export const ORDER_STATUSES = [...ORDER_STEPS, "cancelled", "returned"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "awaiting_verification", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const statusLabel: Record<OrderStatus, string> = {
  pending: "Order placed",
  confirmed: "Confirmed",
  processing: "Being prepared",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

/** Dot colours for status badges; the label text always accompanies them. */
export const statusTone: Record<OrderStatus, string> = {
  pending: "#b7791f",
  confirmed: "#2b6cb0",
  processing: "#6b46c1",
  shipped: "#2c7a7b",
  delivered: "#3f6b4f",
  cancelled: "#9b2c2c",
  returned: "#6b5d52",
};

export const paymentMethodLabel: Record<string, string> = {
  cod: "Cash on Delivery",
  bank_transfer: "Bank Transfer",
  easypaisa: "Easypaisa",
  jazzcash: "JazzCash",
  card: "Card",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  pending: "Payment pending",
  awaiting_verification: "Awaiting verification",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

/** Mirrors the database rule in private.on_order_status_change, so the UI only offers legal moves. */
export function allowedStatuses(from: OrderStatus): OrderStatus[] {
  const active = ORDER_STEPS as readonly OrderStatus[];
  if (from === "cancelled" || from === "returned") return [];
  if (from === "delivered") return ["returned"];
  const next: OrderStatus[] = [...active.filter((s) => s !== from), "cancelled"];
  if (from === "shipped") next.push("returned");
  return next;
}

export const isOrderStatus = (v: unknown): v is OrderStatus => ORDER_STATUSES.includes(v as OrderStatus);
