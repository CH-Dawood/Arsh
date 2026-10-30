"use server";

import { redirect } from "next/navigation";
import { env, isSupabaseConfigured } from "@/lib/env";
import { NOT_LIVE, rateLimit } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, loginSchema, registerSchema } from "@/lib/validation";

export type AuthState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

/** Only same-site relative paths are allowed as post-login destinations (prevents open redirects). */
const safeNext = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/account";
};

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) };
  if (!isSupabaseConfigured) return NOT_LIVE;
  if (!(await rateLimit("login", 10, 900))) return { ok: false, message: "Too many sign-in attempts. Please wait 15 minutes." };

  const { error } = await (await createClient()).auth.signInWithPassword(parsed.data);
  // One message for every failure, so the form never reveals which emails have accounts.
  if (error) return { ok: false, message: "Incorrect email or password." };
  redirect(safeNext(formData.get("next")));
}

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) };
  if (!isSupabaseConfigured) return NOT_LIVE;
  if (!(await rateLimit("register", 5, 3600))) return { ok: false, message: "Too many attempts. Please try again later." };

  const { full_name, email, password } = parsed.data;
  const { data, error } = await (await createClient()).auth.signUp({
    email,
    password,
    options: { data: { full_name }, emailRedirectTo: `${env.siteUrl}/account` },
  });
  if (error) return { ok: false, message: error.code === "weak_password" ? "Please choose a stronger password." : "We couldn't create your account. Please try again." };
  if (!data.session) return { ok: true, message: "Almost there: check your email to confirm your account." };
  redirect("/account");
}

export async function logout() {
  if (isSupabaseConfigured) await (await createClient()).auth.signOut();
  redirect("/");
}
