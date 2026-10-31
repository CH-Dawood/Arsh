"use server";

import { after } from "next/server";
import { z } from "zod";
import { adminAction, dbMessage, fail } from "@/lib/admin/server";
import { ORDER_STATUSES, PAYMENT_STATUSES, statusLabel } from "@/lib/orders";
import { processNotifications } from "@/lib/whatsapp";

const statusInput = z.object({
  orderId: z.uuid(),
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional(),
  courier: z.string().trim().max(60).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
  trackingUrl: z.union([z.literal(""), z.url().startsWith("https://", "Tracking links must start with https://")]).optional(),
  markPaid: z.boolean().optional(),
});

export async function updateOrderStatus(input: z.input<typeof statusInput>) {
  return adminAction(async ({ db }) => {
    const parsed = statusInput.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
    const { orderId, status, note, courier, trackingNumber, trackingUrl, markPaid } = parsed.data;

    const { error } = await db.rpc("admin_update_order_status", {
      p_order_id: orderId, p_status: status, p_note: note || undefined,
      p_courier: courier || undefined, p_tracking_number: trackingNumber || undefined, p_tracking_url: trackingUrl || undefined,
    });
    if (error) return fail(dbMessage(error));

    if (markPaid) {
      const { error: payError } = await db.rpc("admin_set_payment_status", { p_order_id: orderId, p_status: "paid", p_note: "Cash collected on delivery" });
      if (payError) return fail(`Status updated, but the payment couldn't be marked paid: ${dbMessage(payError)}`);
    }

    // Send any WhatsApp message this change queued, after the response is on its way.
    after(() => processNotifications());
    return { ok: true, message: `Order moved to “${statusLabel[status]}”.` };
  });
}

const paymentInput = z.object({ orderId: z.uuid(), status: z.enum(PAYMENT_STATUSES), note: z.string().trim().max(500).optional() });

export async function updatePaymentStatus(input: z.input<typeof paymentInput>) {
  return adminAction(async ({ db }) => {
    const parsed = paymentInput.safeParse(input);
    if (!parsed.success) return fail("Choose a payment status.");
    const { error } = await db.rpc("admin_set_payment_status", { p_order_id: parsed.data.orderId, p_status: parsed.data.status, p_note: parsed.data.note || undefined });
    if (error) return fail(dbMessage(error));
    return { ok: true, message: "Payment status updated." };
  });
}
