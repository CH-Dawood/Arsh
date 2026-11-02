import Link from "next/link";
import { BarList, ColumnChart } from "@/components/admin/charts";
import { LiveRefresh } from "@/components/admin/live-refresh";
import { Suspense } from "react";
import { AdminPageHeader, Card, DataTable, EmptyState, PageSkeleton, StatCard, StatusBadge, formatDateTime } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { formatPKR, formatPKRCompact } from "@/lib/format";
import { ORDER_STATUSES, statusLabel, statusTone, type OrderStatus } from "@/lib/orders";

// The layout's "%s · Admin" template only reaches child routes, so this page spells it out.
export const metadata = { title: { absolute: "Overview · Admin" } };

interface Stats {
  total_orders: number;
  today_orders: number;
  status_counts: Partial<Record<OrderStatus, number>>;
  net_revenue: number;
  month_net_revenue: number;
  gross_sales: number;
  month_gross_sales: number;
  awaiting_payment: number;
  total_customers: number;
  total_products: number;
  active_products: number;
  low_stock_threshold: number;
  low_stock: number;
  out_of_stock: number;
  sales_by_day: { day: string; gross: number; orders: number }[];
  best_sellers: { name: string; slug: string; quantity: number; revenue: number }[];
  recent_orders: { id: string; order_number: string; customer_name: string; city: string; total: number; status: string; created_at: string }[];
  recent_activity: { at: string; order_id: string; order_number: string; customer_name: string; from_status: string | null; to_status: string; note: string | null; actor: string | null }[];
}

export default function AdminOverview() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const { supabase } = await requireAdmin();
  const [{ data, error }, { count: newMessages }] = await Promise.all([
    supabase.rpc("admin_dashboard_stats"),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("is_handled", false),
  ]);
  if (error || !data) return <EmptyState title="Couldn't load the dashboard">Check your connection and refresh the page.</EmptyState>;
  const s = data as unknown as Stats;
  const count = (st: OrderStatus) => s.status_counts[st] ?? 0;
  const dayLabel = (d: string) => new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short" }).format(new Date(`${d}T00:00:00`));

  return (
    <>
      <LiveRefresh table="orders" />
      <AdminPageHeader title="Overview" description="Live figures from your store. Revenue counts only paid orders; cash-on-delivery orders count once you mark them paid." />

      {Boolean(newMessages) && (
        <Link href="/admin/messages" className="mb-3 block border border-warning/40 bg-warning/5 px-5 py-3 text-sm hover:border-warning">
          You have {newMessages} new customer message{newMessages === 1 ? "" : "s"}. <span className="underline underline-offset-4">Read {newMessages === 1 ? "it" : "them"}</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Today's orders" value={s.today_orders} href="/admin/orders" />
        <StatCard label="Total orders" value={s.total_orders} href="/admin/orders" />
        <StatCard label="Net revenue (paid)" value={formatPKRCompact(s.net_revenue)} hint={`This month ${formatPKR(s.month_net_revenue)}`} href="/admin/analytics" />
        <StatCard label="Awaiting payment" value={formatPKRCompact(s.awaiting_payment)} hint={`Gross sales this month ${formatPKR(s.month_gross_sales)}`} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {ORDER_STATUSES.filter((st) => st !== "returned").map((st) => (
          <StatCard key={st} label={statusLabel[st]} value={count(st)} tone={statusTone[st]} href={`/admin/orders?status=${st}`} />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Customers" value={s.total_customers} href="/admin/customers" />
        <StatCard label="Products" value={s.total_products} hint={`${s.active_products} visible in store`} href="/admin/products" />
        <StatCard label="Low stock" value={s.low_stock} hint={`${s.low_stock_threshold} or fewer left`} tone="#b7791f" href="/admin/inventory?filter=low" />
        <StatCard label="Out of stock" value={s.out_of_stock} hint="Sizes with 0 left" tone="#9b2c2c" href="/admin/inventory?filter=out" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title="Sales, last 30 days" actions={<span className="text-xs text-cocoa">Gross sales of non-cancelled orders</span>}>
          <ColumnChart
            title="Gross sales per day for the last 30 days"
            data={s.sales_by_day.map((d) => ({ label: dayLabel(d.day), value: d.gross, detail: `${d.orders} order${d.orders === 1 ? "" : "s"}` }))}
            valueFormat="money"
            emptyText="No sales in the last 30 days yet."
          />
        </Card>
        <Card title="Order status">
          <BarList
            items={ORDER_STATUSES.filter((st) => count(st) > 0).map((st) => ({ label: statusLabel[st], value: count(st), tone: statusTone[st] }))}
            valueFormat="count"
            emptyText="No orders yet."
          />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title="Recent orders" actions={<Link href="/admin/orders" className="text-xs underline underline-offset-4">All orders</Link>}>
          {s.recent_orders.length ? (
            <DataTable>
              <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th className="text-right">Total</th><th>Placed</th></tr></thead>
              <tbody>
                {s.recent_orders.map((o) => (
                  <tr key={o.id} className="hover:bg-linen/60">
                    <td><Link href={`/admin/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline">{o.order_number}</Link></td>
                    <td>{o.customer_name}<span className="block text-xs text-cocoa">{o.city}</span></td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="text-right tabular-nums">{formatPKR(o.total)}</td>
                    <td className="text-cocoa">{formatDateTime(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : <EmptyState title="No orders yet">Orders from your store appear here as soon as they are placed.</EmptyState>}
        </Card>
        <Card title="Best sellers, last 90 days">
          <BarList
            items={s.best_sellers.map((b) => ({ label: b.name, value: b.quantity, detail: formatPKRCompact(b.revenue) }))}
            valueFormat="sold"
            emptyText="Best sellers appear once orders come in."
          />
        </Card>
      </div>

      <Card title="Recent activity" className="mt-6">
        {s.recent_activity.length ? (
          <ol className="divide-y divide-hairline/70">
            {s.recent_activity.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                <Link href={`/admin/orders/${a.order_id}`} className="font-medium hover:underline">{a.order_number}</Link>
                <span className="text-cocoa">{a.customer_name}</span>
                <span className="text-cocoa">{a.from_status ? "moved to" : "placed as"}</span>
                <StatusBadge status={a.to_status} />
                {a.actor && <span className="text-xs text-cocoa">by {a.actor}</span>}
                {a.note && <span className="text-xs italic text-cocoa">“{a.note}”</span>}
                <span className="ml-auto text-xs text-cocoa">{formatDateTime(a.at)}</span>
              </li>
            ))}
          </ol>
        ) : <EmptyState title="No activity yet" />}
      </Card>
    </>
  );
}
