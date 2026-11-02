"use server";

import { z } from "zod";
import { GONE, adminAction, dbMessage, fail } from "@/lib/admin/server";
import { NOTIFICATION_EVENTS } from "@/lib/notification-templates";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkConnection, processNotifications, toWhatsAppNumber, whatsappConfig } from "@/lib/whatsapp";

const templateName = z.string().trim().regex(/^[a-z0-9_]{1,512}$/, "Template names use lowercase letters, numbers and underscores.");
const languageCode = z.string().trim().regex(/^[a-z]{2}(_[A-Z]{2})?$/, "Language codes look like en or en_US.");
const eventConfig = z.object({ enabled: z.boolean(), template: templateName, language: languageCode });
const settingsInput = z.object({
  enabled: z.boolean(),
  events: z.object(Object.fromEntries(NOTIFICATION_EVENTS.map((e) => [e, eventConfig])) as Record<(typeof NOTIFICATION_EVENTS)[number], typeof eventConfig>),
});

export async function saveNotificationSettings(input: z.input<typeof settingsInput>) {
  return adminAction(async ({ db }) => {
    const parsed = settingsInput.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the settings.");
    const { error, count } = await db.from("notification_settings").update(parsed.data, { count: "exact" }).eq("id", 1);
    if (error) return fail(dbMessage(error));
    if (!count) return fail(GONE);
    return {
      ok: true,
      message: parsed.data.enabled && !whatsappConfig.configured
        ? "Saved. Messages will queue but can't be sent until WhatsApp credentials are configured."
        : "Notification settings saved.",
    };
  });
}

export async function checkWhatsAppConnection() {
  return adminAction<{ phone?: string; name?: string; quality?: string; verification?: string }>(async () => {
    const res = await checkConnection();
    if (!res.ok) return fail(res.message === "Not configured" ? "WhatsApp is not configured yet. See the setup steps." : `Connection failed: ${res.message}`);
    return { ok: true, message: `Connected to ${res.name ?? "your business"} (${res.phone ?? "number hidden"}).`, data: { phone: res.phone, name: res.name, quality: res.quality, verification: res.verification } };
  });
}

const testInput = z.object({ phone: z.string().trim().min(10), template: templateName, language: languageCode });

/** Sends a real template message to a number you choose and reports WhatsApp's actual answer. */
export async function sendTestNotification(input: z.input<typeof testInput>) {
  return adminAction(async () => {
    const parsed = testInput.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the test details.");
    const phone = toWhatsAppNumber(parsed.data.phone);
    if (!phone) return fail("Enter a Pakistani mobile number, e.g. 0300 1234567.");
    if (!whatsappConfig.configured) return fail("WhatsApp is not configured yet, so no test can be sent. Add the credentials first.");

    const db = createAdminClient();
    const { data: row, error } = await db
      .from("notification_logs")
      .insert({ phone, event: "test", template_name: parsed.data.template, language: parsed.data.language, variables: [] })
      .select("id")
      .single();
    if (error || !row) return fail(dbMessage(error));
    await processNotifications({ ids: [row.id], manual: true });
    const { data: result } = await db.from("notification_logs").select("status, error").eq("id", row.id).single();
    return result?.status === "sent"
      ? { ok: true, message: "WhatsApp accepted the test message. Delivery is confirmed when the receipt arrives." }
      : fail(`WhatsApp rejected the test: ${result?.error ?? "unknown error"}`);
  });
}

export async function retryNotification(id: string) {
  return adminAction(async () => {
    if (!z.uuid().safeParse(id).success) return fail("Unknown message.");
    if (!whatsappConfig.configured) return fail("WhatsApp is not configured yet.");
    await processNotifications({ ids: [id], manual: true });
    const { data } = await createAdminClient().from("notification_logs").select("status, error").eq("id", id).single();
    return data?.status === "sent" ? { ok: true, message: "Message re-sent and accepted by WhatsApp." } : fail(`Still failing: ${data?.error ?? "unknown error"}`);
  });
}

export async function sendQueuedNow() {
  return adminAction(async () => {
    if (!whatsappConfig.configured) return fail("WhatsApp is not configured yet, so queued messages stay queued.");
    const r = await processNotifications();
    return { ok: r.failed === 0, message: `Sent ${r.sent}, failed ${r.failed}.` };
  });
}
