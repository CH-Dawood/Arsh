import Link from "next/link";
import { Suspense } from "react";
import { LiveRefresh } from "@/components/admin/live-refresh";
import {
  AdminButton, AdminPageHeader, Card, DataTable, EmptyState, Pagination, PaymentBadge, SelectInput, Skeleton, StatusBadge, TextInput, formatDateTime,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { formatPKR } from "@/lib/format";
import { ORDER_STATUSES, isOrderStatus, paymentMethodLabel, statusLabel } from "@/lib/orders";

export const metadata = { title: "Orders" };
const PAGE = 20;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <>
      <LiveRefresh table="orders" />
      <AdminPageHeader title="Orders" description="Every order placed in your store. Open an order to update its status." />
      <Suspense fallback={<Skeleton className="h-[32rem]" />}>
        <OrdersTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function OrdersTable({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q).replace(/[^\p{L}\p{N}\s-]/gu, "").trim().slice(0, 60);
  const status = isOrderStatus(one(sp.status)) ? one(sp.status) : "";
  const from = /^\d{4}-\d{2}-\d{2}$/.test(one(sp.from)) ? one(sp.from) : "";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(one(sp.to)) ? one(sp.to) : "";
  const sort = one(sp.sort) === "oldest" ? "oldest" : "newest";
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  const { supabase } = await requireAdmin();
  let query = supabase
    .from("orders")
    .select("id, order_number, customer_name, phone, city, total, status, payment_status, payment_method, created_at, order_items(count)", { count: "exact" });

  if (q) {
    const digits = q.replace(/\D/g, "");
    const phone = digits.startsWith("92") ? `0${digits.slice(2)}` : digits;
    const parts = [`order_number.ilike.%${q}%`, `customer_name.ilike.%${q}%`];
    if (phone.length >= 4) parts.push(`phone.like.%${phone}%`);
    query = query.or(parts.join(","));
  }
  if (status) query = query.eq("status", status as (typeof ORDER_STATUSES)[number]);
  if (from) query = query.gte("created_at", `${from}T00:00:00+05:00`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999+05:00`);
  const { data: orders, count, error } = await query
    .order("created_at", { ascending: sort === "oldest" })
    .range((page - 1) * PAGE, page * PAGE - 1);

  const params = (p: number) => {
    const u = new URLSearchParams();
    Object.entries({ q, status, from, to, sort: sort === "oldest" ? "oldest" : "" }).forEach(([k, v]) => v && u.set(k, v));
    if (p > 1) u.set("page", String(p));
    return `/admin/orders${u.size ? `?${u}` : ""}`;
  };

  return (
    <Card>
      <form className="grid gap-3 border-b border-hairline p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]" role="search">
        <label className="sr-only" htmlFor="o-q">Search orders</label>
        <TextInput id="o-q" name="q" defaultValue={q} placeholder="Order number, customer name or phone" />
        <label className="sr-only" htmlFor="o-status">Status</label>
        <SelectInput id="o-status" name="status" defaultValue={status}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
        </SelectInput>
        <label className="sr-only" htmlFor="o-from">From date</label>
        <TextInput id="o-from" type="date" name="from" defaultValue={from} aria-label="From date" />
        <label className="sr-only" htmlFor="o-to">To date</label>
        <TextInput id="o-to" type="date" name="to" defaultValue={to} aria-label="To date" />
        <label className="sr-only" htmlFor="o-sort">Sort</label>
        <SelectInput id="o-sort" name="sort" defaultValue={sort}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </SelectInput>
        <div className="flex gap-2">
          <AdminButton type="submit">Apply</AdminButton>
          {(q || status || from || to || sort === "oldest") && <Link href="/admin/orders" className="inline-flex h-10 items-center px-2 text-sm underline underline-offset-4">Clear</Link>}
        </div>
      </form>

      {error ? (
        <EmptyState title="Couldn't load orders">Please refresh the page.</EmptyState>
      ) : !orders?.length ? (
        <EmptyState title={q || status || from || to ? "No orders match these filters" : "No orders yet"}>
          {q || status || from || to ? "Try a different search or clear the filters." : "New orders appear here automatically."}
        </EmptyState>
      ) : (
        <>
          <p className="px-5 pt-4 text-xs text-cocoa">{count} order{count === 1 ? "" : "s"}</p>
          <DataTable>
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Items</th><th>Payment</th><th>Status</th><th className="text-right">Total</th><th>Placed</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-linen/60">
                  <td><Link href={`/admin/orders/${o.id}`} className="font-medium underline-offset-4 hover:underline">{o.order_number}</Link></td>
                  <td>{o.customer_name}<span className="block text-xs text-cocoa">{o.phone} · {o.city}</span></td>
                  <td className="tabular-nums">{(o.order_items as unknown as { count: number }[])[0]?.count ?? 0}</td>
                  <td><span className="block text-xs">{paymentMethodLabel[o.payment_method] ?? o.payment_method}</span><PaymentBadge status={o.payment_status} /></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-right tabular-nums">{formatPKR(o.total)}</td>
                  <td className="whitespace-nowrap text-cocoa">{formatDateTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <Pagination page={page} pageCount={Math.max(1, Math.ceil((count ?? 0) / PAGE))} href={params} />
        </>
      )}
    </Card>
  );
}
