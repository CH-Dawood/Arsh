import Link from "next/link";
import { Suspense } from "react";
import { StockAdjustButton } from "@/components/admin/stock-adjust";
import { AdminButton, AdminPageHeader, Card, DataTable, EmptyState, Pagination, Skeleton, TextInput, formatDateTime } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Inventory" };
const PAGE = 30;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const reasonLabel: Record<string, string> = { order: "Order placed", cancel: "Order cancelled", return: "Order returned", restock: "Restock", adjustment: "Adjustment" };

export default function InventoryPage({ searchParams }: PageProps<"/admin/inventory">) {
  return (
    <>
      <AdminPageHeader title="Inventory" description="Stock for every size. Orders reduce stock automatically; cancellations and returns put it back exactly once." />
      <Suspense fallback={<Skeleton className="h-[40rem]" />}>
        <Inventory searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Inventory({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filter = ["low", "out"].includes(one(sp.filter)) ? one(sp.filter) : "";
  const q = one(sp.q).replace(/[^\p{L}\p{N}\s-]/gu, "").trim().slice(0, 60);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  const { supabase } = await requireAdmin();
  const { data: settings } = await supabase.from("store_settings").select("low_stock_threshold").eq("id", 1).single();
  const low = settings?.low_stock_threshold ?? 3;

  let query = supabase
    .from("product_variants")
    .select("id, sku, stock, is_active, size:sizes(label, sort_order), color:colors(name), product:products!inner(id, name, is_active)", { count: "exact" })
    .eq("is_active", true);
  if (filter === "low") query = query.gt("stock", 0).lte("stock", low);
  if (filter === "out") query = query.eq("stock", 0);
  // "ABC-M" style input searches SKUs; anything else searches product names.
  if (q && /^[A-Za-z0-9]+-[A-Za-z0-9-]*$/.test(q)) query = query.ilike("sku", `%${q}%`);
  else if (q) query = query.ilike("product.name", `%${q}%`);
  const [{ data: variants, count }, { data: moves }] = await Promise.all([
    query.order("stock").order("sku").range((page - 1) * PAGE, page * PAGE - 1),
    supabase
      .from("inventory_movements")
      .select("id, delta, reason, note, created_at, order:orders(id, order_number), actor:profiles(full_name), variant:product_variants(sku, product:products(name))")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);
  const rows = variants ?? [];
  const href = (p: number) => {
    const u = new URLSearchParams();
    if (filter) u.set("filter", filter);
    if (q) u.set("q", q);
    if (p > 1) u.set("page", String(p));
    return `/admin/inventory${u.size ? `?${u}` : ""}`;
  };
  const tab = (value: string, label: string) => (
    <Link href={value ? `/admin/inventory?filter=${value}` : "/admin/inventory"} aria-current={filter === value ? "page" : undefined}
      className={`px-3 py-1.5 text-sm ${filter === value ? "bg-espresso text-ivory" : "hover:bg-linen"}`}>{label}</Link>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card>
        <div className="flex flex-col gap-3 border-b border-hairline p-4 lg:flex-row lg:items-center lg:justify-between">
          <nav className="flex gap-1" aria-label="Stock filter">{tab("", "All sizes")}{tab("low", `Low (≤ ${low})`)}{tab("out", "Out of stock")}</nav>
          <form className="flex gap-2" role="search">
            {filter && <input type="hidden" name="filter" value={filter} />}
            <label className="sr-only" htmlFor="inv-q">Search by product name or SKU</label>
            <TextInput id="inv-q" name="q" defaultValue={q} placeholder="Product name or SKU" className="w-56" />
            <AdminButton type="submit" variant="outline">Search</AdminButton>
          </form>
        </div>
        {!rows.length ? (
          <EmptyState title={filter === "out" ? "Nothing is out of stock" : filter === "low" ? "No low stock" : "No sizes found"} />
        ) : (
          <>
            <DataTable>
              <thead><tr><th>Product</th><th>Size</th><th>SKU</th><th className="text-right">Stock</th><th /></tr></thead>
              <tbody>
                {rows.map((v) => {
                  const product = v.product as { id: string; name: string; is_active: boolean };
                  const size = (v.size as { label: string } | null)?.label ?? "";
                  const color = (v.color as { name: string } | null)?.name;
                  return (
                    <tr key={v.id}>
                      <td><Link href={`/admin/products/${product.id}`} className="hover:underline">{product.name}</Link>{!product.is_active && <span className="ml-2 text-xs text-cocoa">(hidden)</span>}</td>
                      <td>{size}{color && <span className="text-cocoa"> · {color}</span>}</td>
                      <td className="text-xs text-cocoa">{v.sku}</td>
                      <td className={`text-right font-medium tabular-nums ${v.stock === 0 ? "text-danger" : v.stock <= low ? "text-[#b7791f]" : ""}`}>{v.stock}</td>
                      <td className="text-right"><StockAdjustButton variantId={v.id} label={`${product.name}, ${size}`} stock={v.stock} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
            <Pagination page={page} pageCount={Math.max(1, Math.ceil((count ?? 0) / PAGE))} href={href} />
          </>
        )}
      </Card>

      <Card title="Inventory history">
        {!moves?.length ? <EmptyState title="No stock changes yet" /> : (
          <ol className="divide-y divide-hairline/70">
            {moves.map((m) => {
              const variant = m.variant as { sku: string; product: { name: string } | null } | null;
              const order = m.order as { id: string; order_number: string } | null;
              return (
                <li key={m.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{variant?.product?.name ?? "Deleted product"} <span className="text-xs text-cocoa">{variant?.sku}</span></p>
                    <p className="text-xs text-cocoa">
                      {reasonLabel[m.reason] ?? m.reason}
                      {order && <> · <Link href={`/admin/orders/${order.id}`} className="underline">{order.order_number}</Link></>}
                      {(m.actor as { full_name: string | null } | null)?.full_name && ` · ${(m.actor as { full_name: string }).full_name}`}
                      {m.note && ` · “${m.note}”`}
                    </p>
                    <p className="text-xs text-cocoa">{formatDateTime(m.created_at)}</p>
                  </div>
                  <span className={`shrink-0 font-medium tabular-nums ${m.delta < 0 ? "text-danger" : "text-success"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
