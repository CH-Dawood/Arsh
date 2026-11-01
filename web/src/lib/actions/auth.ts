"use server";

import { redirect } from "next/navigation";
import { env, isSupabaseConfigured } from "@/lib/env";
import { NOT_LIVE, rateLimit, safeRedirectPath } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validation";

export type AuthState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

const safeNext = (v: FormDataEntryValue | null) => safeRedirectPath(String(v ?? ""));

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) };
  if (!isSupabaseConfigured) return NOT_LIVE;
  // Per IP, and per account so a password can't be guessed from many addresses.
  if (!(await rateLimit("login", 10, 900)) || !(await rateLimit("login-email", 10, 900, parsed.data.email))) {
    return { ok: false, message: "Too many sign-in attempts. Please wait 15 minutes." };
  }

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

/** Emails a reset link. The reply is the same whether or not the email has an account. */
export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) };
  if (!isSupabaseConfigured) return NOT_LIVE;
  if (!(await rateLimit("reset", 5, 3600)) || !(await rateLimit("reset-email", 3, 3600, parsed.data.email))) {
    return { ok: false, message: "Too many requests. Please try again later." };
  }
  await (await createClient()).auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.siteUrl}/auth/callback?next=/reset-password`,
  });
  return { ok: true, message: "If an account uses this email, a link to reset the password is on its way. It works once, in this browser." };
}

/** Sets a new password for the signed-in user (after following the reset link). */
export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) };
  if (!isSupabaseConfigured) return NOT_LIVE;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { ok: false, message: "This reset link has expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { ok: false, message: error.code === "weak_password" ? "Please choose a stronger password."
      : error.code === "same_password" ? "Choose a password you haven't used here before." : "We couldn't update your password. Please try again." };
  }
  redirect("/account");
}

export async function logout() {
  if (isSupabaseConfigured) await (await createClient()).auth.signOut();
  redirect("/");
}
