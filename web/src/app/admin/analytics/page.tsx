import { Suspense } from "react";
import { Download } from "lucide-react";
import { BarList, ColumnChart } from "@/components/admin/charts";
import { AdminButton, AdminPageHeader, Card, EmptyState, SelectInput, Skeleton, StatCard, TextInput } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { formatPKR, formatPKRCompact } from "@/lib/format";
import { ORDER_STATUSES, statusLabel, statusTone, type OrderStatus } from "@/lib/orders";

export const metadata = { title: "Sales & Analytics" };
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const ISO = /^\d{4}-\d{2}-\d{2}$/;

interface Report {
  totals: { orders: number; cancelled_orders: number; gross_sales: number; discounts: number; shipping: number; refunds: number; net_revenue: number; awaiting_payment: number; average_order_value: number };
  series: { bucket: string; orders: number; gross: number; net: number }[];
  status_distribution: Partial<Record<OrderStatus, number>>;
  best_products: { name: string; slug: string; quantity: number; revenue: number }[];
  best_categories: { name: string; quantity: number; revenue: number }[];
}

/** Today's date in Pakistan, as YYYY-MM-DD. */
const pkToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
const shift = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export default function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  return (
    <>
      <AdminPageHeader title="Sales & Analytics" description="Figures from your orders. Net revenue only includes orders marked paid; cancelled orders never count as sales." />
      <Suspense fallback={<Skeleton className="h-[40rem]" />}>
        <Analytics searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Analytics({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  // Session check first: it makes this a per-request render, so "today" is read at request time.
  const { supabase } = await requireAdmin();
  const today = pkToday();
  const range = one(sp.range) || "30d";
  const presets: Record<string, [string, string]> = {
    "7d": [shift(today, -6), today],
    "30d": [shift(today, -29), today],
    "90d": [shift(today, -89), today],
    month: [`${today.slice(0, 7)}-01`, today],
    year: [`${today.slice(0, 4)}-01-01`, today],
  };
  const [from, to] = range === "custom" && ISO.test(one(sp.from)) && ISO.test(one(sp.to)) && one(sp.from) <= one(sp.to)
    ? [one(sp.from), one(sp.to)]
    : presets[range] ?? presets["30d"];
  const span = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  const unit = ["day", "week", "month", "year"].includes(one(sp.by)) ? one(sp.by) : span > 400 ? "month" : span > 92 ? "week" : "day";

  const { data, error } = await supabase.rpc("admin_sales_report", { p_from: from, p_to: to, p_granularity: unit });
  if (error || !data) return <EmptyState title="Couldn't load the report">Check the dates and try again.</EmptyState>;
  const r = data as unknown as Report;
  const t = r.totals;
  const bucketLabel = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return unit === "year" ? String(d.getFullYear())
      : unit === "month" ? new Intl.DateTimeFormat("en-PK", { month: "short", year: "2-digit" }).format(d)
      : new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short" }).format(d);
  };
  const unitWord = { day: "Daily", week: "Weekly", month: "Monthly", year: "Yearly" }[unit];

  return (
    <>
      <Card className="mb-6">
        <form className="grid items-end gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]">
          <label className="text-xs text-cocoa">Period
            <SelectInput name="range" defaultValue={range} className="mt-1">
              <option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option>
              <option value="month">This month</option><option value="year">This year</option><option value="custom">Custom dates</option>
            </SelectInput>
          </label>
          <label className="text-xs text-cocoa">From (custom)<TextInput type="date" name="from" defaultValue={from} className="mt-1" /></label>
          <label className="text-xs text-cocoa">To (custom)<TextInput type="date" name="to" defaultValue={to} className="mt-1" /></label>
          <label className="text-xs text-cocoa">Group by
            <SelectInput name="by" defaultValue={unit} className="mt-1">
              <option value="day">Day</option><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option>
            </SelectInput>
          </label>
          <AdminButton type="submit">Show</AdminButton>
          <a href={`/admin/analytics/export?from=${from}&to=${to}`} className="inline-flex h-10 items-center justify-center gap-2 border border-hairline bg-paper px-4 text-sm hover:border-espresso" download>
            <Download className="size-4" aria-hidden /> Export CSV
          </a>
        </form>
        <p className="border-t border-hairline px-4 py-2 text-xs text-cocoa">Showing {from} to {to} (Pakistan time). “Custom dates” uses the From/To fields.</p>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Gross sales" value={formatPKR(t.gross_sales)} hint="Items sold, before discounts; excludes cancelled orders" />
        <StatCard label="Discounts" value={formatPKR(t.discounts)} hint="Discount codes applied" />
        <StatCard label="Refunds" value={formatPKR(t.refunds)} hint="Orders marked refunded" />
        <StatCard label="Net revenue" value={formatPKR(t.net_revenue)} hint="Order totals marked paid (incl. shipping)" />
        <StatCard label="Awaiting payment" value={formatPKR(t.awaiting_payment)} hint="Not yet paid, e.g. COD in transit" />
        <StatCard label="Orders" value={t.orders} hint={`${t.cancelled_orders} cancelled`} />
        <StatCard label="Average order value" value={formatPKR(t.average_order_value)} hint="Excludes cancelled orders" />
        <StatCard label="Shipping charged" value={formatPKR(t.shipping)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title={`${unitWord} gross sales`}>
          <ColumnChart title={`${unitWord} gross sales from ${from} to ${to}`} valueFormat="money"
            data={r.series.map((s) => ({ label: bucketLabel(s.bucket), value: s.gross, detail: `${s.orders} order${s.orders === 1 ? "" : "s"}` }))} />
        </Card>
        <Card title={`${unitWord} net revenue (paid)`}>
          <ColumnChart title={`${unitWord} net revenue from ${from} to ${to}`} valueFormat="money" emptyText="No paid orders in this period."
            data={r.series.map((s) => ({ label: bucketLabel(s.bucket), value: s.net }))} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Best-selling products">
          <BarList items={r.best_products.map((p) => ({ label: p.name, value: p.quantity, detail: formatPKRCompact(p.revenue) }))} valueFormat="sold" emptyText="No sales in this period." />
        </Card>
        <Card title="Best-selling categories">
          <BarList items={r.best_categories.map((c) => ({ label: c.name, value: c.revenue, detail: `${c.quantity} pcs` }))} valueFormat="money" emptyText="No sales in this period." />
        </Card>
        <Card title="Order status">
          <BarList items={ORDER_STATUSES.filter((s) => r.status_distribution[s]).map((s) => ({ label: statusLabel[s], value: r.status_distribution[s] ?? 0, tone: statusTone[s] }))} valueFormat="count" emptyText="No orders in this period." />
        </Card>
      </div>
    </>
  );
}
