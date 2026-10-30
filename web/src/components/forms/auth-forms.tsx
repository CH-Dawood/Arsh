"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { login, register } from "@/lib/actions/auth";
import { useFormAction } from "@/lib/use-form-action";

export function LoginForm({ next }: { next?: string }) {
  const [state, onSubmit, pending] = useFormAction(login, null);
  const e = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <input type="hidden" name="next" value={next ?? "/account"} />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={e.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required error={e.password} />
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
      <p className="text-center text-sm text-cocoa">New here? <Link href="/register" className="text-espresso underline underline-offset-4">Create an account</Link></p>
    </form>
  );
}

export function RegisterForm() {
  const [state, onSubmit, pending] = useFormAction(register, null);
  const e = state?.errors ?? {};
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field label="Full name" name="full_name" autoComplete="name" required error={e.full_name} />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={e.email} />
      <Field label="Password" name="password" type="password" autoComplete="new-password" required error={e.password} hint="At least 10 characters with upper- and lowercase letters and a number." />
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Creating account…" : "Create account"}</Button>
      <p className="text-center text-sm text-cocoa">Already have an account? <Link href="/login" className="text-espresso underline underline-offset-4">Sign in</Link></p>
    </form>
  );
}
