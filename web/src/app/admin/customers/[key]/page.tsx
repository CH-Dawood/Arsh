import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Card, DataTable, EmptyState, PageSkeleton, PaymentBadge, StatCard, StatusBadge, formatDateTime } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { formatPKR } from "@/lib/format";

export const metadata = { title: "Customer" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function CustomerPage({ params }: PageProps<"/admin/customers/[key]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Customer params={params} />
    </Suspense>
  );
}

async function Customer({ params }: Pick<PageProps<"/admin/customers/[key]">, "params">) {
  const key = decodeURIComponent((await params).key);
  const isPhone = /^03\d{9}$/.test(key);
  if (!isPhone && !UUID.test(key)) notFound();
  const { supabase } = await requireAdmin();

  const ordersQuery = supabase.from("orders").select("id, order_number, customer_name, email, city, address_line, total, status, payment_status, created_at, user_id").order("created_at", { ascending: false });
  const { data: orders } = await (isPhone ? ordersQuery.eq("phone", key) : ordersQuery.eq("user_id", key));
  const userId = isPhone ? orders?.find((o) => o.user_id)?.user_id : key;
  const { data: profile } = userId ? await supabase.from("profiles").select("full_name, phone, created_at").eq("id", userId).maybeSingle() : { data: null };
  if (!orders?.length && !profile) notFound();

  const latest = orders?.[0];
  const kept = (orders ?? []).filter((o) => !["cancelled", "returned"].includes(o.status));
  const name = latest?.customer_name ?? profile?.full_name ?? "Customer";

  return (
    <>
      <Link href="/admin/customers" className="mb-4 inline-flex items-center gap-2 text-sm text-cocoa hover:text-espresso"><ArrowLeft className="size-4" aria-hidden /> All customers</Link>
      <h1 className="text-3xl sm:text-4xl">{name}</h1>
      <p className="mt-1 text-sm text-cocoa">
        {[isPhone ? key : profile?.phone, latest?.email, profile ? `Registered ${formatDateTime(profile.created_at)}` : "Guest checkout"].filter(Boolean).join(" · ")}
      </p>
      {latest && <p className="mt-1 text-sm text-cocoa">Last delivery address: {latest.address_line}, {latest.city}</p>}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Orders" value={orders?.length ?? 0} />
        <StatCard label="Total spent" value={formatPKR(kept.reduce((n, o) => n + o.total, 0))} hint="Excludes cancelled and returned" />
        <StatCard label="Last order" value={latest ? formatDateTime(latest.created_at).split(",")[0] : "—"} />
      </div>

      <Card title="Order history" className="mt-6">
        {!orders?.length ? <EmptyState title="No orders yet" /> : (
          <DataTable>
            <thead><tr><th>Order</th><th>Status</th><th>Payment</th><th className="text-right">Total</th><th>Placed</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-linen/60">
                  <td><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.order_number}</Link></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td><PaymentBadge status={o.payment_status} /></td>
                  <td className="text-right tabular-nums">{formatPKR(o.total)}</td>
                  <td className="text-cocoa">{formatDateTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>
    </>
  );
}
