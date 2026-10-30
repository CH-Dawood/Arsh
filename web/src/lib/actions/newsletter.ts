"use server";

import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { NOT_LIVE, rateLimit, type ActionState } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.email().max(254);

export async function subscribeToNewsletter(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = schema.safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { ok: false, message: "Please enter a valid email address." };
  if (!isSupabaseConfigured) return NOT_LIVE;

  if (!(await rateLimit("newsletter", 5, 3600))) {
    return { ok: false, message: "Too many attempts. Please try again in a little while." };
  }

  const { error } = await createAdminClient()
    .from("newsletter_subscribers")
    .insert({ email: email.data, source: "footer" });

  // 23505 = already subscribed; answer the same way so the form never reveals who is on the list.
  if (error && error.code !== "23505") {
    console.error("newsletter insert failed", error.code);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  return { ok: true, message: "Thank you for subscribing. Watch your inbox for new collections." };
}
