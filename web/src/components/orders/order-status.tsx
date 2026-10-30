import { Check } from "lucide-react";
import type { TrackedOrder } from "@/lib/actions/orders";
import { cn, formatPKR } from "@/lib/format";

const steps = ["pending", "confirmed", "processing", "shipped", "delivered"] as const;
const stepLabel: Record<string, string> = { pending: "Order placed", confirmed: "Confirmed", processing: "Being prepared", shipped: "Shipped", delivered: "Delivered" };
const payLabel: Record<string, string> = { cod: "Cash on Delivery", bank_transfer: "Bank Transfer", easypaisa: "Easypaisa", jazzcash: "JazzCash", card: "Card" };
const payStatus: Record<string, string> = { pending: "Payment pending", awaiting_verification: "Payment being verified", paid: "Paid", failed: "Payment failed", refunded: "Refunded" };

const date = (iso: string) => new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(iso));

export function OrderStatus({ order }: { order: TrackedOrder }) {
  const ended = order.status === "cancelled" || order.status === "returned";
  const current = steps.indexOf(order.status as (typeof steps)[number]);
  const reachedAt = (s: string) => order.history.find((h) => h.status === s)?.at;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label text-cocoa">Order</p>
          <p className="mt-1 font-display text-3xl">{order.order_number}</p>
          <p className="mt-1 text-sm text-cocoa">Placed {date(order.created_at)} · Delivering to {order.city}</p>
        </div>
        <p className="label border border-hairline px-3 py-2">{payLabel[order.payment_method] ?? order.payment_method} · {payStatus[order.payment_status] ?? order.payment_status}</p>
      </div>

      {ended ? (
        <p className="border border-danger/30 bg-danger/5 px-4 py-3 text-danger">This order was {order.status}.</p>
      ) : (
        <ol className="grid gap-4 sm:grid-cols-5">
          {steps.map((s, i) => {
            const done = i <= current;
            return (
              <li key={s} className="flex items-center gap-3 sm:flex-col sm:items-start">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border", done ? "border-espresso bg-espresso text-ivory" : "border-hairline text-taupe")}>
                  {done ? <Check className="size-4" aria-hidden /> : <span className="text-xs">{i + 1}</span>}
                </span>
                <span>
                  <span className={cn("block text-sm", !done && "text-cocoa")}>{stepLabel[s]}</span>
                  {reachedAt(s) && <span className="block text-xs text-cocoa">{date(reachedAt(s)!)}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {(order.courier || order.tracking_number) && (
        <p className="text-sm">
          {order.courier && <>Courier: <strong className="font-medium">{order.courier}</strong>. </>}
          {order.tracking_number && <>Tracking number: <strong className="font-medium">{order.tracking_number}</strong>. </>}
          {order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Track with courier</a>}
        </p>
      )}

      <div className="border-t border-hairline pt-6">
        <h2 className="label mb-4">Items</h2>
        <ul className="space-y-2 text-sm">
          {order.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-4"><span>{it.name} <span className="text-cocoa">· {it.variant}</span></span><span>× {it.quantity}</span></li>
          ))}
        </ul>
        <p className="mt-6 flex justify-between border-t border-hairline pt-4 text-lg"><span>Total</span><span>{formatPKR(order.total)}</span></p>
      </div>
    </div>
  );
}
