"use client";

import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { sendContactMessage } from "@/lib/actions/contact";
import { useFormAction } from "@/lib/use-form-action";

export function ContactForm() {
  const [state, onSubmit, pending] = useFormAction(sendContactMessage, null);
  const e = state?.errors ?? {};
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      {/* Honeypot for bots: hidden from people and screen readers. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <Field label="Name" name="name" autoComplete="name" required error={e.name} />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={e.email} />
      <Field label="Phone" name="phone" type="tel" autoComplete="tel" error={e.phone} />
      <Field label="Subject" name="subject" error={e.subject} />
      <Field label="Message" name="message" required multiline rows={6} error={e.message} className="sm:col-span-2" />
      <div className="space-y-4 sm:col-span-2">
        <FormMessage state={state} />
        <Button type="submit" size="lg" disabled={pending}>{pending ? "Sending…" : "Send message"}</Button>
      </div>
    </form>
  );
}
