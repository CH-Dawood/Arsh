import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { LiveRefresh } from "@/components/admin/live-refresh";
import { OrderStatusControl, PaymentStatusControl } from "@/components/admin/order-status-control";
import { Card, PageSkeleton, PaymentBadge, StatusBadge, formatDateTime } from "@/components/admin/ui";
import { NotificationStatus } from "@/components/admin/notification-status";
import { requireAdmin } from "@/lib/auth";
import { imageUrl } from "@/lib/catalog/supabase-source";
import { formatPKR } from "@/lib/format";
import { paymentMethodLabel, type OrderStatus, type PaymentStatus } from "@/lib/orders";

export const metadata = { title: "Order" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const eventLabel: Record<string, string> = {
  order_placed: "Order placed", order_confirmed: "Confirmed", order_processing: "Being prepared",
  order_shipped: "Shipped", order_delivered: "Delivered", order_cancelled: "Cancelled", test: "Test",
};

export default function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}

async function OrderDetail({ params }: Pick<PageProps<"/admin/orders/[id]">, "params">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data: o } = await supabase
    .from("orders")
    .select(`*, order_items(*), order_status_history(id, from_status, to_status, note, created_at, actor:profiles(full_name)),
      payments(id, method, amount, status, verified_at, created_at), notification_logs(id, event, status, error, attempts, created_at, sent_at)`)
    .eq("id", id)
    .maybeSingle();
  if (!o) notFound();

  const history = [...o.order_status_history].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const logs = [...o.notification_logs].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <>
      <LiveRefresh table="orders" filter={`id=eq.${o.id}`} />
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-2 text-sm text-cocoa hover:text-espresso">
        <ArrowLeft className="size-4" aria-hidden /> All orders
      </Link>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-cocoa">Order</p>
          <h1 className="text-3xl sm:text-4xl">{o.order_number}</h1>
          <p className="mt-1 text-sm text-cocoa">Placed {formatDateTime(o.created_at)}{o.delivered_at && ` · Delivered ${formatDateTime(o.delivered_at)}`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={o.status} />
          <PaymentBadge status={o.payment_status} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <Card title="Items">
            <ul className="divide-y divide-hairline/70">
              {o.order_items.map((i) => (
                <li key={i.id} className="flex gap-4 px-5 py-4">
                  <span className="relative h-20 w-16 shrink-0 overflow-hidden bg-champagne">
                    {i.image_path && <Image src={imageUrl(i.image_path)} alt="" fill sizes="64px" className="object-cover" />}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <Link href={`/products/${i.product_slug}`} target="_blank" className="font-medium hover:underline">{i.product_name}</Link>
                    <p className="text-cocoa">{i.variant_label} · SKU {i.sku}</p>
                    <p className="text-cocoa">{i.quantity} × {formatPKR(i.unit_price)}</p>
                  </div>
                  <p className="text-sm tabular-nums">{formatPKR(i.line_total ?? i.unit_price * i.quantity)}</p>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-hairline px-5 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-cocoa">Subtotal</dt><dd className="tabular-nums">{formatPKR(o.subtotal)}</dd></div>
              {o.discount_total > 0 && <div className="flex justify-between"><dt className="text-cocoa">Discount{o.coupon_code && ` (${o.coupon_code})`}</dt><dd className="tabular-nums">−{formatPKR(o.discount_total)}</dd></div>}
              <div className="flex justify-between"><dt className="text-cocoa">Shipping</dt><dd className="tabular-nums">{o.shipping_fee ? formatPKR(o.shipping_fee) : "Free"}</dd></div>
              <div className="flex justify-between border-t border-hairline pt-2 text-base font-medium"><dt>Total</dt><dd className="tabular-nums">{formatPKR(o.total)}</dd></div>
            </dl>
          </Card>

          <Card title="Status history">
            <ol className="space-y-4 px-5 py-4">
              {history.map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" aria-hidden />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={h.to_status} />
                      <span className="text-xs text-cocoa">{formatDateTime(h.created_at)}</span>
                      <span className="text-xs text-cocoa">
                        {h.from_status ? `by ${(h.actor as { full_name: string | null } | null)?.full_name ?? "an admin"}` : "by the customer at checkout"}
                      </span>
                    </div>
                    {h.note && <p className="mt-1 text-cocoa">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="WhatsApp messages" actions={<Link href="/admin/notifications" className="text-xs underline underline-offset-4">Notification settings</Link>}>
            {!o.whatsapp_opt_in ? (
              <p className="px-5 py-4 text-sm text-cocoa">The customer did not opt in to WhatsApp updates at checkout, so no messages are sent for this order.</p>
            ) : logs.length ? (
              <ul className="divide-y divide-hairline/70">
                {logs.map((n) => (
                  <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                    <span>{eventLabel[n.event] ?? n.event}</span>
                    <NotificationStatus status={n.status} error={n.error} />
                    <span className="text-xs text-cocoa">{formatDateTime(n.sent_at ?? n.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-cocoa">No messages for this order (notifications may be switched off for these events).</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Update status">
            <OrderStatusControl
              order={{
                id: o.id, status: o.status as OrderStatus, payment_method: o.payment_method, payment_status: o.payment_status as PaymentStatus,
                courier: o.courier, tracking_number: o.tracking_number, tracking_url: o.tracking_url,
              }}
            />
          </Card>

          <Card title="Customer">
            <dl className="grid gap-3 px-5 py-4 text-sm">
              <div><dt className="text-xs text-cocoa">Name</dt><dd>{o.customer_name}</dd></div>
              <div><dt className="text-xs text-cocoa">Phone</dt><dd><a href={`tel:${o.phone}`} className="hover:underline">{o.phone}</a></dd></div>
              <div><dt className="text-xs text-cocoa">Email</dt><dd>{o.email ? <a href={`mailto:${o.email}`} className="hover:underline">{o.email}</a> : <span className="text-cocoa">Not provided</span>}</dd></div>
              <div><dt className="text-xs text-cocoa">Shipping address</dt><dd className="whitespace-pre-line">{o.address_line}<br />{o.city}{o.postal_code && ` ${o.postal_code}`}</dd></div>
              {o.notes && <div><dt className="text-xs text-cocoa">Customer note</dt><dd className="italic">{o.notes}</dd></div>}
              <div><Link href={`/admin/customers/${encodeURIComponent(o.phone)}`} className="text-xs underline underline-offset-4">View all orders from this customer</Link></div>
            </dl>
          </Card>

          <Card title="Payment">
            <div className="space-y-4 px-5 py-4 text-sm">
              <p>{paymentMethodLabel[o.payment_method] ?? o.payment_method}</p>
              <PaymentStatusControl orderId={o.id} status={o.payment_status as PaymentStatus} />
            </div>
          </Card>

          {(o.courier || o.tracking_number) && (
            <Card title="Shipment">
              <dl className="grid gap-2 px-5 py-4 text-sm">
                {o.courier && <div><dt className="text-xs text-cocoa">Courier</dt><dd>{o.courier}</dd></div>}
                {o.tracking_number && <div><dt className="text-xs text-cocoa">Tracking number</dt><dd>{o.tracking_number}</dd></div>}
                {o.tracking_url && <div><a href={o.tracking_url} target="_blank" rel="noopener noreferrer" className="text-xs underline underline-offset-4">Open courier tracking</a></div>}
              </dl>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
