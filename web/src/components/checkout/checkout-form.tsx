"use client";

import Image from "next/image";
import { Banknote, CreditCard, Landmark, LoaderCircle, Lock, Smartphone } from "lucide-react";
import { useState, useTransition } from "react";
import { CartNotice } from "@/components/cart/cart-sync";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { placeOrder, quoteCart, type Quote } from "@/lib/actions/checkout";
import { cn, formatPKR } from "@/lib/format";
import { useHydrated } from "@/lib/hooks";
import { cartSubtotal, useCart } from "@/lib/store/cart";
import { useFormAction } from "@/lib/use-form-action";

type Settings = { freeShippingThreshold: number; shippingFee: number; codEnabled: boolean; bankTransferEnabled: boolean };

export function CheckoutForm({ settings }: { settings: Settings }) {
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const [state, onSubmit, pending] = useFormAction(placeOrder, null);
  const [coupon, setCoupon] = useState("");
  const [quoted, setQuoted] = useState<{ items: string; quote: Quote } | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [checking, startChecking] = useTransition();

  const methods = [
    { value: "cod", label: "Cash on Delivery", note: "Pay in cash when your order arrives.", Icon: Banknote, enabled: settings.codEnabled },
    { value: "bank_transfer", label: "Bank Transfer", note: "Transfer to our account; we confirm once payment is received.", Icon: Landmark, enabled: settings.bankTransferEnabled },
    { value: "easypaisa", label: "Easypaisa", note: "Not available yet", Icon: Smartphone, enabled: false },
    { value: "jazzcash", label: "JazzCash", note: "Not available yet", Icon: Smartphone, enabled: false },
    { value: "card", label: "Debit / Credit Card", note: "Not available yet", Icon: CreditCard, enabled: false },
  ];
  const [method, setMethod] = useState(methods.find((m) => m.enabled)?.value ?? "");

  if (!hydrated) return <div className="h-96 animate-pulse bg-linen" aria-busy="true" />;
  if (!lines.length) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-3xl">Your bag is empty</p>
        <ButtonLink href="/shop" className="mt-8">Continue shopping</ButtonLink>
      </div>
    );
  }

  const items = JSON.stringify(lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })));
  // A server quote only applies to the exact bag it was calculated for.
  const quote = quoted?.items === items ? quoted.quote : null;
  const subtotal = quote?.subtotal ?? cartSubtotal(lines);
  const discount = quote?.discount ?? 0;
  const shipping = quote?.shipping ?? (subtotal - discount >= settings.freeShippingThreshold ? 0 : settings.shippingFee);
  const e = state?.errors ?? {};

  const applyCoupon = () =>
    startChecking(async () => {
      const res = await quoteCart(items, coupon);
      if (res.ok) {
        setQuoted({ items, quote: res.quote });
        setCouponMsg({ ok: true, message: `Code ${res.quote.coupon?.code} applied.` });
      } else {
        setQuoted(null);
        setCouponMsg({ ok: false, message: res.message });
      }
    });

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <input type="hidden" name="items" value={items} />
      <input type="hidden" name="coupon" value={quoted?.quote.coupon?.code ?? ""} />

      <div className="space-y-12">
        <fieldset className="space-y-5">
          <legend className="mb-6 font-display text-3xl">Delivery details</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" name="full_name" autoComplete="name" required error={e.full_name} className="sm:col-span-2" />
            <Field label="Mobile number" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" required error={e.phone} hint="For delivery updates and the courier." />
            <Field label="Email" name="email" type="email" autoComplete="email" error={e.email} hint="For your order confirmation." />
            <Field label="City" name="city" autoComplete="address-level2" required error={e.city} />
            <Field label="Postal code" name="postal_code" inputMode="numeric" autoComplete="postal-code" maxLength={5} error={e.postal_code} />
            <Field label="Complete address" name="address_line" autoComplete="street-address" placeholder="House, street, area, landmark" required error={e.address_line} className="sm:col-span-2" multiline />
            <Field label="Order notes" name="notes" placeholder="Delivery instructions, preferred time…" maxLength={500} error={e.notes} className="sm:col-span-2" multiline />
          </div>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" name="whatsapp_opt_in" className="mt-0.5 size-4 accent-espresso" />
            <span>
              Send me order updates on WhatsApp
              <span className="block text-xs text-cocoa">Confirmation, dispatch and delivery messages to the mobile number above. Optional.</span>
            </span>
          </label>
        </fieldset>

        <fieldset>
          <legend className="mb-6 font-display text-3xl">Payment</legend>
          <div role="radiogroup" className="space-y-3">
            {methods.map((m) => (
              <label
                key={m.value}
                className={cn(
                  "flex cursor-pointer items-start gap-4 border p-4 transition-colors",
                  method === m.value ? "border-espresso bg-linen" : "border-hairline hover:border-taupe",
                  !m.enabled && "cursor-not-allowed opacity-50 hover:border-hairline",
                )}
              >
                <input type="radio" name="payment_method" value={m.value} checked={method === m.value} disabled={!m.enabled} onChange={() => setMethod(m.value)} className="mt-1 accent-espresso" />
                <m.Icon className="mt-0.5 size-5 shrink-0" strokeWidth={1.25} aria-hidden />
                <span>
                  <span className="block font-medium">{m.label}</span>
                  <span className="block text-sm text-cocoa">{m.note}</span>
                </span>
              </label>
            ))}
          </div>
          {e.payment_method && <p className="mt-2 text-sm text-danger">Please choose a payment method.</p>}
        </fieldset>
      </div>

      <aside className="h-fit space-y-6 bg-linen p-6 sm:p-8 lg:sticky lg:top-32">
        <h2 className="text-2xl">Your order</h2>
        <CartNotice />
        <ul className="max-h-72 space-y-4 overflow-y-auto">
          {lines.map((l) => (
            <li key={l.variantId} className="flex gap-4 text-sm">
              <span className="relative aspect-[3/4] w-14 shrink-0 bg-champagne">
                {l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />}
                <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-espresso text-[0.625rem] text-ivory">{l.quantity}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-base leading-tight">{l.name}</span>
                <span className="text-xs text-cocoa">{l.sizeLabel}</span>
              </span>
              <span>{formatPKR(l.price * l.quantity)}</span>
            </li>
          ))}
        </ul>

        <div>
          <label htmlFor="coupon-code" className="label mb-2 block text-cocoa">Discount code</label>
          <div className="flex gap-2">
            <input
              id="coupon-code"
              value={coupon}
              onChange={(ev) => setCoupon(ev.target.value.toUpperCase())}
              onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); if (coupon.trim()) applyCoupon(); } }}
              maxLength={30}
              autoComplete="off"
              className="min-w-0 flex-1 border border-hairline bg-ivory px-4 py-3 text-sm uppercase outline-none focus:border-espresso"
            />
            <Button variant="outline" disabled={!coupon.trim() || checking} onClick={applyCoupon}>
              {checking ? <LoaderCircle className="size-4 animate-spin" aria-label="Checking" /> : "Apply"}
            </Button>
          </div>
          {couponMsg && <p role="status" className={cn("mt-2 text-xs", couponMsg.ok ? "text-success" : "text-danger")}>{couponMsg.message}</p>}
        </div>

        <dl className="space-y-3 border-t border-hairline pt-5 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPKR(subtotal)}</dd></div>
          {discount > 0 && <div className="flex justify-between text-success"><dt>Discount</dt><dd>−{formatPKR(discount)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping ? formatPKR(shipping) : "Free"}</dd></div>
          <div className="flex justify-between border-t border-hairline pt-3 text-lg font-medium">
            <dt>{quote ? "Total" : "Estimated total"}</dt><dd>{formatPKR(subtotal - discount + shipping)}</dd>
          </div>
        </dl>

        <FormMessage state={state} />
        <Button type="submit" size="lg" className="w-full" disabled={pending || !method}>
          {pending ? <><LoaderCircle className="size-4 animate-spin" aria-hidden /> Placing order…</> : <><Lock className="size-3.5" aria-hidden /> Place order</>}
        </Button>
        <p className="text-center text-xs text-cocoa">Prices and stock are confirmed by our server when you place your order.</p>
      </aside>
    </form>
  );
}
