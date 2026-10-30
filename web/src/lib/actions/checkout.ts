"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { NOT_LIVE, rateLimit } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { cartItemsSchema, checkoutSchema, fieldErrors } from "@/lib/validation";

export type CheckoutState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

export interface Quote {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon: { code: string; discount: number; error: string | null } | null;
}

const messages: Record<string, string> = {
  ITEM_UNAVAILABLE: "Some items in your bag are no longer available in the quantity selected. Please review your bag.",
  INVALID_CART: "Your bag looks out of date. Please review it and try again.",
  INVALID_PHONE: "Please enter a valid Pakistani mobile number.",
  PAYMENT_METHOD_UNAVAILABLE: "That payment method isn't available right now. Please choose another.",
  COUPON_INVALID: "That discount code is not valid or has expired.",
  COUPON_MIN_ORDER: "Your order doesn't reach the minimum amount for that discount code.",
  COUPON_EXHAUSTED: "That discount code has reached its usage limit.",
  COUPON_LIMIT_REACHED: "You've already used that discount code.",
};
const friendly = (raw: string) => messages[Object.keys(messages).find((k) => raw.includes(k)) ?? ""] ?? "We couldn't place your order. Please try again.";

function parseItems(raw: FormDataEntryValue | null) {
  try {
    return cartItemsSchema.safeParse(JSON.parse(String(raw ?? "[]")));
  } catch {
    return cartItemsSchema.safeParse([]);
  }
}

/** Server-priced totals for the checkout summary. The browser never decides a price. */
export async function quoteCart(itemsJson: string, coupon: string | null): Promise<{ ok: true; quote: Quote } | { ok: false; message: string }> {
  const items = parseItems(itemsJson);
  if (!items.success) return { ok: false, message: "Your bag is empty." };
  if (!isSupabaseConfigured) return { ok: false, message: "Discount codes are checked once the store goes live." };
  if (!(await rateLimit("quote", 30, 300))) return { ok: false, message: "Too many attempts. Please wait a few minutes." };

  const user = await getCurrentUser();
  const { data, error } = await createAdminClient().rpc("quote_cart", {
    p_items: items.data, p_coupon_code: coupon?.trim() || null, p_user_id: user?.id ?? null,
  });
  if (error || !data) return { ok: false, message: "We couldn't calculate your total. Please try again." };
  const quote = data as Quote;
  if (quote.coupon?.error) return { ok: false, message: friendly(quote.coupon.error) };
  return { ok: true, quote };
}

export async function placeOrder(_: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) };

  const items = parseItems(formData.get("items"));
  if (!items.success) return { ok: false, message: "Your bag is empty." };
  if (!isSupabaseConfigured) return NOT_LIVE;
  if (!(await rateLimit("checkout", 8, 600))) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };

  const user = await getCurrentUser();
  const { coupon, payment_method, ...customer } = parsed.data;
  const { data, error } = await createAdminClient()
    .rpc("place_order", {
      p_items: items.data,
      p_customer: customer,
      p_payment_method: payment_method,
      p_coupon_code: coupon ?? null,
      p_user_id: user?.id ?? null,
    })
    .single();

  if (error || !data) {
    if (error) console.error("place_order failed", error.code);
    return { ok: false, message: friendly(error?.message ?? "") };
  }

  const order = data as { order_number: string };
  // Lets the confirmation page show this order without putting personal data in the URL.
  (await cookies()).set("last_order", JSON.stringify({ n: order.order_number, p: customer.phone }), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/orders", maxAge: 60 * 60 * 24,
  });
  redirect(`/orders/${order.order_number}`);
}
