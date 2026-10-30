"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { NOT_LIVE, rateLimit } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { contactSchema, fieldErrors } from "@/lib/validation";

export type ContactState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

export async function sendContactMessage(_: ContactState, formData: FormData): Promise<ContactState> {
  // Honeypot: real visitors never see or fill this field.
  if (formData.get("website")) return { ok: true, message: "Thank you, we'll be in touch soon." };

  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) };
  if (!isSupabaseConfigured) return NOT_LIVE;
  if (!(await rateLimit("contact", 5, 3600))) return { ok: false, message: "Too many messages. Please try again later." };

  const { error } = await createAdminClient().from("contact_messages").insert(parsed.data);
  if (error) {
    console.error("contact insert failed", error.code);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  return { ok: true, message: "Thank you, we'll be in touch soon." };
}
