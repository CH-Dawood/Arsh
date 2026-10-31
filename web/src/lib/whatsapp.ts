import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * WhatsApp Business Cloud API (Meta) sender. Credentials come only from server environment
 * variables; nothing here is ever sent to the browser.
 *
 *   WHATSAPP_ACCESS_TOKEN        permanent system-user token with whatsapp_business_messaging
 *   WHATSAPP_PHONE_NUMBER_ID     the sender phone number's ID (not the phone number itself)
 *   WHATSAPP_BUSINESS_ACCOUNT_ID optional, used to list approved templates
 *   WHATSAPP_WEBHOOK_VERIFY_TOKEN / WHATSAPP_APP_SECRET   for delivery receipts (webhook)
 *   WHATSAPP_API_VERSION         optional, defaults below
 */
const API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const whatsappConfig = {
  configured: Boolean(TOKEN && PHONE_ID),
  hasToken: Boolean(TOKEN),
  hasPhoneNumberId: Boolean(PHONE_ID),
  hasBusinessAccountId: Boolean(WABA_ID),
  hasWebhook: Boolean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && process.env.WHATSAPP_APP_SECRET),
  apiVersion: API_VERSION,
};

/** Pakistani mobile in any common format → 923XXXXXXXXX, or null. */
export function toWhatsAppNumber(input: string) {
  const d = input.replace(/\D/g, "");
  const local = d.startsWith("92") ? `0${d.slice(2)}` : d.startsWith("3") ? `0${d}` : d;
  return /^03\d{9}$/.test(local) ? `92${local.slice(1)}` : null;
}

type GraphError = { error?: { message?: string; code?: number; error_subcode?: number; error_data?: { details?: string } } };

async function graph<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: T & GraphError }> {
  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T & GraphError;
  return { ok: res.ok && !body.error, status: res.status, body };
}

const describe = (body: GraphError, status: number) =>
  body.error
    ? `${body.error.message ?? "WhatsApp API error"}${body.error.code ? ` (code ${body.error.code})` : ""}${body.error.error_data?.details ? `: ${body.error.error_data.details}` : ""}`
    : `WhatsApp API returned HTTP ${status}`;

/** Live check of the sender number: proves the token and phone number ID actually work. */
export async function checkConnection() {
  if (!whatsappConfig.configured) return { ok: false as const, message: "Not configured" };
  try {
    const { ok, status, body } = await graph<{ display_phone_number?: string; verified_name?: string; quality_rating?: string; code_verification_status?: string }>(
      `${PHONE_ID}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`,
    );
    if (!ok) return { ok: false as const, message: describe(body, status) };
    return { ok: true as const, phone: body.display_phone_number, name: body.verified_name, quality: body.quality_rating, verification: body.code_verification_status };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "Network error" };
  }
}

/** Approved message templates on the WhatsApp Business Account (needs WHATSAPP_BUSINESS_ACCOUNT_ID). */
export async function listTemplates() {
  if (!whatsappConfig.configured || !WABA_ID) return null;
  try {
    const { ok, body } = await graph<{ data?: { name: string; language: string; status: string }[] }>(`${WABA_ID}/message_templates?fields=name,language,status&limit=100`);
    return ok ? body.data ?? [] : null;
  } catch {
    return null;
  }
}

async function sendTemplate(to: string, template: string, language: string, variables: string[]) {
  const components = variables.length
    ? [{ type: "body", parameters: variables.map((text) => ({ type: "text", text: String(text).slice(0, 1000) })) }]
    : [];
  return graph<{ messages?: { id: string; message_status?: string }[] }>(`${PHONE_ID}/messages`, {
    method: "POST",
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "template", template: { name: template, language: { code: language }, components } }),
  });
}

/**
 * Sends queued notifications. Rows are claimed atomically (no double sending), each result is
 * stored exactly as WhatsApp returned it, and nothing is marked sent without a message id from Meta.
 * Returns counts for the admin UI. Does nothing while WhatsApp is not configured.
 */
export async function processNotifications({ ids, manual = false }: { ids?: string[]; manual?: boolean } = {}) {
  const result = { sent: 0, failed: 0, skipped: !whatsappConfig.configured };
  if (!whatsappConfig.configured) return result;

  const db = createAdminClient();
  const { data: claimed, error } = await db.rpc("claim_notifications", { p_ids: ids, p_limit: 20, p_manual: manual });
  if (error || !claimed) {
    console.error("claim_notifications failed", error?.message);
    return result;
  }

  for (const n of claimed) {
    if (!manual && n.event !== "test" && Date.now() - new Date(n.created_at).getTime() > MAX_AGE_MS) {
      await db.from("notification_logs").update({ status: "failed", error: "Expired: not sent within 24 hours of the order event." }).eq("id", n.id);
      result.failed++;
      continue;
    }
    try {
      const vars = Array.isArray(n.variables) ? (n.variables as unknown[]).map(String) : [];
      const { ok, status, body } = await sendTemplate(n.phone, n.template_name, n.language, vars);
      const messageId = body.messages?.[0]?.id;
      if (ok && messageId) {
        await db.from("notification_logs")
          .update({ status: "sent", provider_message_id: messageId, sent_at: new Date().toISOString(), error: null, response: body as never })
          .eq("id", n.id);
        result.sent++;
      } else {
        await db.from("notification_logs").update({ status: "failed", error: describe(body, status), response: body as never }).eq("id", n.id);
        result.failed++;
      }
    } catch (err) {
      await db.from("notification_logs")
        .update({ status: "failed", error: err instanceof Error ? `Network error: ${err.message}` : "Network error" })
        .eq("id", n.id);
      result.failed++;
    }
  }
  return result;
}
