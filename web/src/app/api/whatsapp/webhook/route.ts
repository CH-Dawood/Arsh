import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * WhatsApp Cloud API webhook: delivery receipts for messages we sent.
 * GET  — Meta's one-time subscription check (hub.verify_token).
 * POST — status updates, accepted only with a valid X-Hub-Signature-256 from our app secret.
 */
const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;

// Receipts can arrive out of order; a status never moves backwards.
const rank: Record<string, number> = { pending: 0, sending: 0, sent: 1, failed: 1, delivered: 2, read: 3 };

export function GET(request: Request) {
  const url = new URL(request.url);
  if (!VERIFY_TOKEN) return new Response("Webhook not configured", { status: 503 });
  if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === VERIFY_TOKEN) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

type StatusUpdate = { id: string; status: string; timestamp?: string; errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[] };
type Payload = { entry?: { changes?: { value?: { statuses?: StatusUpdate[] } }[] }[] };

export async function POST(request: Request) {
  if (!APP_SECRET) return new Response("Webhook not configured", { status: 503 });
  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const expected = `sha256=${createHmac("sha256", APP_SECRET).update(raw).digest("hex")}`;
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: Payload;
  try {
    payload = JSON.parse(raw) as Payload;
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const updates = payload.entry?.flatMap((e) => e.changes?.flatMap((c) => c.value?.statuses ?? []) ?? []) ?? [];
  if (!updates.length) return new Response("OK");

  const db = createAdminClient();
  for (const u of updates) {
    if (!["sent", "delivered", "read", "failed"].includes(u.status)) continue;
    const { data: row } = await db.from("notification_logs").select("id, status").eq("provider_message_id", u.id).maybeSingle();
    if (!row) continue;
    if (rank[u.status] < rank[row.status] || (u.status === "failed" && rank[row.status] > 1)) continue;
    if (u.status === row.status) continue;
    const err = u.errors?.[0];
    await db
      .from("notification_logs")
      .update({
        status: u.status as "sent" | "delivered" | "read" | "failed",
        ...(u.status === "failed" ? { error: [err?.title ?? err?.message ?? "Delivery failed", err?.code && `(code ${err.code})`, err?.error_data?.details].filter(Boolean).join(" ") } : {}),
      })
      .eq("id", row.id);
  }
  // Always 200 for verified payloads so Meta doesn't retry receipts we've already handled.
  return new Response("OK");
}
