"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminAction, dbMessage, fail } from "@/lib/admin/server";
import { toWhatsAppNumber } from "@/lib/whatsapp";

const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
const httpsUrl = z.union([z.literal(""), z.url("Enter a full link starting with https://").startsWith("https://", "Links must start with https://")]).optional().transform((v) => v || null);
const amount = (label: string) => z.coerce.number({ error: `${label} must be a number.` }).int(`${label} must be whole rupees.`).min(0).max(10_000_000);

const settingsInput = z.object({
  store_name: z.string().trim().min(1, "Enter the store name.").max(60),
  tagline: opt(120),
  logo_path: opt(500),
  contact_email: z.union([z.literal(""), z.email("Enter a valid email.")]).optional().transform((v) => v || null),
  contact_phone: opt(30),
  address: opt(300),
  whatsapp_number: z.string().trim().optional(),
  whatsapp_message: opt(300),
  instagram_url: httpsUrl,
  tiktok_url: httpsUrl,
  facebook_url: httpsUrl,
  free_shipping_threshold: amount("Free shipping threshold"),
  shipping_fee: amount("Shipping charge"),
  low_stock_threshold: z.coerce.number().int().min(0).max(1000),
  store_open: z.boolean(),
  closed_message: opt(200),
  cod_enabled: z.boolean(),
  bank_transfer_enabled: z.boolean(),
  bank_name: opt(80),
  bank_account_title: opt(120),
  bank_account_number: opt(40),
  bank_iban: z.string().optional()
    .transform((v) => v?.replace(/\s/g, "").toUpperCase() || null)
    .refine((v) => v === null || /^PK\d{2}[A-Z]{4}[0-9A-Z]{16}$/.test(v), "IBAN should look like PK36SCBL0000001123456702."),
});
export type SettingsInput = z.input<typeof settingsInput>;

export async function saveSettings(input: SettingsInput) {
  return adminAction(async ({ db }) => {
    const parsed = settingsInput.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return fail(issue?.message ?? "Check the form.", { [String(issue?.path[0] ?? "form")]: issue?.message ?? "" });
    }
    const s = parsed.data;
    let whatsapp: string | null = null;
    if (s.whatsapp_number) {
      whatsapp = toWhatsAppNumber(s.whatsapp_number) ?? (/^[1-9]\d{9,14}$/.test(s.whatsapp_number.replace(/\D/g, "")) ? s.whatsapp_number.replace(/\D/g, "") : null);
      if (!whatsapp) return fail("Enter the WhatsApp number with country code, e.g. 92 300 1234567.", { whatsapp_number: "Invalid number" });
    }
    if (s.bank_transfer_enabled && !(s.bank_name && s.bank_account_title && s.bank_account_number)) {
      return fail("To offer bank transfer, fill in the bank name, account title and account number.", { bank_name: "Required for bank transfer" });
    }
    if (!s.cod_enabled && !s.bank_transfer_enabled && s.store_open) {
      return fail("Turn on at least one payment method, or close the store.");
    }

    const { error } = await db.from("store_settings").update({ ...s, whatsapp_number: whatsapp }).eq("id", 1);
    if (error) return fail(dbMessage(error));
    updateTag("settings");
    return { ok: true, message: "Settings saved. The website now uses the new values." };
  });
}
