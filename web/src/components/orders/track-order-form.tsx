"use client";

import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { trackOrder } from "@/lib/actions/orders";
import { useFormAction } from "@/lib/use-form-action";
import { OrderStatus } from "./order-status";

export function TrackOrderForm() {
  const [state, onSubmit, pending] = useFormAction(trackOrder, null);
  const e = state?.errors ?? {};
  return (
    <div className="space-y-12">
      <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <Field label="Order number" name="order_number" placeholder="ORD-261030-A1B2C3" autoComplete="off" required error={e.order_number} />
        <Field label="Phone number" name="phone" type="tel" inputMode="tel" placeholder="0300 1234567" autoComplete="tel" required error={e.phone} />
        <Button type="submit" size="lg" disabled={pending} className="sm:mt-[1.6rem]">{pending ? "Checking…" : "Track"}</Button>
        <div className="sm:col-span-3"><FormMessage state={state?.order ? null : state} /></div>
      </form>
      {state?.order && <div className="border border-hairline p-6 sm:p-10"><OrderStatus order={state.order} /></div>}
    </div>
  );
}
