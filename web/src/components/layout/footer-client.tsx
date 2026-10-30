"use client";

import { ArrowUp } from "lucide-react";
import { useActionState } from "react";
import { subscribeToNewsletter } from "@/lib/actions/newsletter";
import { cn } from "@/lib/format";

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeToNewsletter, null);
  return (
    <form action={action} className="w-full max-w-md">
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <div className="flex border-b border-ivory/40 focus-within:border-ivory">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Your email address"
          className="min-w-0 flex-1 bg-transparent py-3 text-ivory outline-none placeholder:text-ivory/50"
        />
        <button type="submit" disabled={pending} className="label px-2 text-ivory transition-colors hover:text-gold disabled:opacity-50">
          {pending ? "Joining…" : "Subscribe"}
        </button>
      </div>
      <p role="status" className={cn("mt-3 min-h-5 text-sm", state?.ok ? "text-champagne" : "text-ivory/70")}>{state?.message}</p>
    </form>
  );
}

export function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      className="label group flex items-center gap-2 text-ivory/80 transition-colors hover:text-ivory"
    >
      Back to top
      <ArrowUp className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" aria-hidden />
    </button>
  );
}
