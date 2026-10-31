"use server";

import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/env";
import { NOT_LIVE, rateLimit } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrors, trackSchema } from "@/lib/validation";

export interface TrackedOrder {
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
  city: string;
  total: number;
  courier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  delivered_at: string | null;
  items: { name: string; variant: string; quantity: number }[];
  history: { status: string; at: string }[];
}

export type TrackState = { ok: boolean; message: string; errors?: Record<string, string>; order?: TrackedOrder } | null;

/** Server-side lookup shared by the tracking form and the order confirmation page. */
export async function lookupOrder(orderNumber: string, phone: string) {
  const { data, error } = await createAdminClient().rpc("track_order", { p_order_number: orderNumber, p_phone: phone });
  return error ? null : ((data as TrackedOrder | null) ?? null);
}

export async function trackOrder(_: TrackState, formData: FormData): Promise<TrackState> {
  const parsed = trackSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) };
  if (!isSupabaseConfigured) return NOT_LIVE;
  if (!(await rateLimit("track", 10, 600))) return { ok: false, message: "Too many attempts. Please wait a few minutes." };

  const order = await lookupOrder(parsed.data.order_number, parsed.data.phone);
  // Same answer for "no such order" and "wrong phone", so order numbers can't be probed.
  return order ? { ok: true, message: "", order } : { ok: false, message: "We couldn't find an order with those details." };
}

/**
 * Live refresh for an order already shown to this visitor. Needs the same order number + phone
 * pair as the first lookup; on the confirmation page the phone comes from the httpOnly cookie,
 * so it never has to reach the browser.
 */
export async function refreshOrder(orderNumber: string, phone?: string): Promise<TrackedOrder | null> {
  if (!isSupabaseConfigured) return null;
  let p = phone;
  if (!p) {
    try {
      const ref = JSON.parse((await cookies()).get("last_order")?.value ?? "{}") as { n?: string; p?: string };
      if (ref.n === orderNumber) p = ref.p;
    } catch {}
  }
  const parsed = trackSchema.safeParse({ order_number: orderNumber, phone: p ?? "" });
  if (!parsed.success) return null;
  if (!(await rateLimit("track-live", 60, 600))) return null;
  return lookupOrder(parsed.data.order_number, parsed.data.phone);
}
