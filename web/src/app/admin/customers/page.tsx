import Link from "next/link";
import { Suspense } from "react";
import { AdminButton, AdminPageHeader, Card, DataTable, EmptyState, Pagination, Skeleton, TextInput, formatDate } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { formatPKR } from "@/lib/format";

export const metadata = { title: "Customers" };
const PAGE = 25;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  return (
    <>
      <AdminPageHeader title="Customers" description="Everyone who has ordered (guests are grouped by phone number) and registered accounts. Spending excludes cancelled and returned orders." />
      <Suspense fallback={<Skeleton className="h-[32rem]" />}>
        <CustomersTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CustomersTable({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q).replace(/[^\p{L}\p{N}\s@.+-]/gu, "").trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_customers", { p_search: q || undefined, p_limit: PAGE, p_offset: (page - 1) * PAGE });
  const rows = data ?? [];
  const total = Number(rows[0]?.total_count ?? 0);

  return (
    <Card>
      <form className="flex gap-2 border-b border-hairline p-4" role="search">
        <label className="sr-only" htmlFor="c-q">Search customers</label>
        <TextInput id="c-q" name="q" defaultValue={q} placeholder="Name, phone or email" className="max-w-md" />
        <AdminButton type="submit">Search</AdminButton>
      </form>
      {error ? <EmptyState title="Couldn't load customers">Please refresh the page.</EmptyState>
        : !rows.length ? <EmptyState title={q ? "No customers match" : "No customers yet"} />
        : (
          <>
            <p className="px-5 pt-4 text-xs text-cocoa">{total} customer{total === 1 ? "" : "s"}</p>
            <DataTable>
              <thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th className="text-right">Orders</th><th className="text-right">Total spent</th><th>Last order</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.customer_key} className="hover:bg-linen/60">
                    <td>
                      <Link href={`/admin/customers/${encodeURIComponent(c.customer_key)}`} className="font-medium hover:underline">{c.name ?? "Unnamed"}</Link>
                      <span className="block text-xs text-cocoa">{c.registered ? "Registered" : "Guest"}</span>
                    </td>
                    <td>{c.phone ?? <span className="text-cocoa">—</span>}</td>
                    <td className="text-cocoa">{c.email ?? "—"}</td>
                    <td className="text-right tabular-nums">{c.orders_count}</td>
                    <td className="text-right tabular-nums">{formatPKR(Number(c.total_spent))}</td>
                    <td className="text-cocoa">{c.last_order_at ? formatDate(c.last_order_at) : "No orders"}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination page={page} pageCount={Math.max(1, Math.ceil(total / PAGE))} href={(p) => `/admin/customers?${new URLSearchParams({ ...(q && { q }), ...(p > 1 && { page: String(p) }) })}`} />
          </>
        )}
    </Card>
  );
}
