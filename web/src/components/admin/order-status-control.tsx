"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { updateOrderStatus, updatePaymentStatus } from "@/lib/admin/actions/orders";
import { toastResult } from "@/lib/admin/toast";
import { cn } from "@/lib/format";
import { ORDER_STEPS, PAYMENT_STATUSES, allowedStatuses, paymentStatusLabel, statusLabel, statusTone, type OrderStatus, type PaymentStatus } from "@/lib/orders";
import { ConfirmDialog, Toggle } from "./client";
import { AdminButton, FieldRow, SelectInput, TextArea, TextInput } from "./ui";

export function OrderStatusControl({ order }: {
  order: { id: string; status: OrderStatus; payment_method: string; payment_status: PaymentStatus; courier: string | null; tracking_number: string | null; tracking_url: string | null };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [note, setNote] = useState("");
  const [courier, setCourier] = useState(order.courier ?? "");
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");
  const [markPaid, setMarkPaid] = useState(order.payment_method === "cod" && order.payment_status !== "paid");
  const [confirming, setConfirming] = useState(false);

  const options = allowedStatuses(order.status);
  const final = options.length === 0;
  const changed = status !== order.status;
  const shippingChanged = status === "shipped" && (courier !== (order.courier ?? "") || tracking !== (order.tracking_number ?? "") || trackingUrl !== (order.tracking_url ?? ""));
  const current = ORDER_STEPS.indexOf(order.status as (typeof ORDER_STEPS)[number]);

  const submit = () =>
    start(async () => {
      const ok = toastResult(await updateOrderStatus({
        orderId: order.id, status, note, courier, trackingNumber: tracking, trackingUrl,
        markPaid: status === "delivered" && order.payment_method === "cod" && markPaid,
      }));
      setConfirming(false);
      if (ok) {
        setNote("");
        router.refresh();
      }
    });

  return (
    <div className="space-y-6 p-5">
      {/* Visual step selector */}
      <ol className="grid grid-cols-5 gap-1" aria-label="Order progress">
        {ORDER_STEPS.map((s, i) => {
          const done = current >= 0 && i <= current;
          const selectable = options.includes(s);
          const selected = status === s;
          return (
            <li key={s}>
              <button
                type="button"
                disabled={!selectable && s !== order.status}
                onClick={() => setStatus(s)}
                aria-pressed={selected}
                className={cn(
                  "flex w-full flex-col items-center gap-1.5 px-1 py-2 text-center text-[11px] leading-tight transition-colors disabled:cursor-default",
                  selected ? "bg-espresso text-ivory" : "hover:bg-linen",
                )}
              >
                <span
                  className={cn("grid size-7 place-items-center rounded-full border text-xs", done ? "border-transparent text-ivory" : "border-hairline bg-paper text-cocoa")}
                  style={done ? { background: statusTone[s] } : undefined}
                >
                  {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
                </span>
                {statusLabel[s]}
              </button>
            </li>
          );
        })}
      </ol>

      {final ? (
        <p className="border border-hairline bg-linen px-4 py-3 text-sm">This order is <strong className="font-medium">{statusLabel[order.status].toLowerCase()}</strong>. Its status can no longer change.</p>
      ) : (
        <div className="space-y-4">
          <FieldRow label="New status" htmlFor="new-status">
            <SelectInput id="new-status" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
              <option value={order.status}>{statusLabel[order.status]} (current)</option>
              {options.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
            </SelectInput>
          </FieldRow>

          {status === "shipped" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow label="Courier (optional)" htmlFor="courier"><TextInput id="courier" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="TCS, Leopards, M&P…" maxLength={60} /></FieldRow>
              <FieldRow label="Tracking number (optional)" htmlFor="tracking"><TextInput id="tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} maxLength={80} /></FieldRow>
              <FieldRow label="Courier tracking link (optional)" htmlFor="tracking-url" className="sm:col-span-2"><TextInput id="tracking-url" type="url" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://" /></FieldRow>
            </div>
          )}

          {status === "delivered" && order.payment_method === "cod" && order.payment_status !== "paid" && (
            <Toggle checked={markPaid} onChange={setMarkPaid} label="Cash collected: also mark as paid" description="Counts this order in net revenue." />
          )}

          <FieldRow label="Note (optional, internal)" htmlFor="note" hint="Saved in the order history with your name and the time.">
            <TextArea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </FieldRow>

          <AdminButton disabled={pending || (!changed && !shippingChanged)} onClick={() => (status === "cancelled" || status === "delivered" ? setConfirming(true) : submit())}>
            {pending ? "Updating…" : "Update status"}
          </AdminButton>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title={status === "delivered" ? "Mark this order as delivered?" : "Cancel this order?"}
        destructive={status !== "delivered"}
        confirmLabel={status === "delivered" ? "Mark as delivered" : "Cancel order"}
        pending={pending}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      >
        {status === "delivered"
          ? "After this, the order can only be marked as returned. Its status can't move back."
          : "The items go back into stock and any discount code use is released. Cancelled orders can't be reopened."}
      </ConfirmDialog>
    </div>
  );
}

export function PaymentStatusControl({ orderId, status }: { orderId: string; status: PaymentStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(status);
  return (
    <div className="flex items-end gap-2">
      <FieldRow label="Payment status" htmlFor="pay-status" className="flex-1">
        <SelectInput id="pay-status" value={value} onChange={(e) => setValue(e.target.value as PaymentStatus)}>
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{paymentStatusLabel[s]}</option>)}
        </SelectInput>
      </FieldRow>
      <AdminButton
        variant="outline"
        disabled={pending || value === status}
        onClick={() => start(async () => { if (toastResult(await updatePaymentStatus({ orderId, status: value }))) router.refresh(); })}
      >
        {pending ? "Saving…" : "Save"}
      </AdminButton>
    </div>
  );
}
