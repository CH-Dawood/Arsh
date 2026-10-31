import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { ProductVisibilityToggle } from "@/components/admin/product-row-actions";
import { AdminButton, AdminLinkButton, AdminPageHeader, Card, DataTable, EmptyState, Pagination, SelectInput, Skeleton, TextInput } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { imageUrl } from "@/lib/catalog/supabase-source";
import { formatPKR } from "@/lib/format";

export const metadata = { title: "Products" };
const PAGE = 20;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <>
      <AdminPageHeader
        title="Products"
        description="Everything in your catalogue. Changes appear on the website immediately."
        actions={<AdminLinkButton href="/admin/products/new"><Plus className="size-4" aria-hidden /> Add product</AdminLinkButton>}
      />
      <Suspense fallback={<Skeleton className="h-[32rem]" />}>
        <ProductsTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ProductsTable({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q).replace(/[^\p{L}\p{N}\s-]/gu, "").trim().slice(0, 60);
  const category = one(sp.category);
  const visibility = ["visible", "hidden"].includes(one(sp.visibility)) ? one(sp.visibility) : "";
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  const { supabase } = await requireAdmin();
  const [{ data: categories }, { data: settings }] = await Promise.all([
    supabase.from("categories").select("id, name, slug").order("sort_order"),
    supabase.from("store_settings").select("low_stock_threshold").eq("id", 1).single(),
  ]);
  const low = settings?.low_stock_threshold ?? 3;
  const cat = categories?.find((c) => c.slug === category);

  let query = supabase
    .from("products")
    .select("id, name, slug, base_price, compare_at_price, is_active, is_featured, is_new_arrival, is_best_seller, is_luxury, created_at, category:categories(name), images:product_images(storage_path, sort_order), variants:product_variants(stock, is_active)", { count: "exact" });
  if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
  if (cat) query = query.eq("category_id", cat.id);
  if (visibility) query = query.eq("is_active", visibility === "visible");
  const { data: products, count, error } = await query.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);

  const href = (p: number) => {
    const u = new URLSearchParams();
    Object.entries({ q, category: cat?.slug ?? "", visibility }).forEach(([k, v]) => v && u.set(k, v));
    if (p > 1) u.set("page", String(p));
    return `/admin/products${u.size ? `?${u}` : ""}`;
  };

  return (
    <Card>
      <form className="grid gap-3 border-b border-hairline p-4 sm:grid-cols-[2fr_1fr_1fr_auto]" role="search">
        <label className="sr-only" htmlFor="p-q">Search products</label>
        <TextInput id="p-q" name="q" defaultValue={q} placeholder="Search by name" />
        <label className="sr-only" htmlFor="p-cat">Category</label>
        <SelectInput id="p-cat" name="category" defaultValue={cat?.slug ?? ""}>
          <option value="">All categories</option>
          {categories?.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </SelectInput>
        <label className="sr-only" htmlFor="p-vis">Visibility</label>
        <SelectInput id="p-vis" name="visibility" defaultValue={visibility}>
          <option value="">Visible and hidden</option>
          <option value="visible">Visible only</option>
          <option value="hidden">Hidden only</option>
        </SelectInput>
        <AdminButton type="submit">Apply</AdminButton>
      </form>

      {error ? <EmptyState title="Couldn't load products">Please refresh the page.</EmptyState>
        : !products?.length ? (
          <EmptyState title={q || cat || visibility ? "No products match" : "No products yet"} action={<AdminLinkButton href="/admin/products/new">Add your first product</AdminLinkButton>}>
            {q || cat || visibility ? "Try another search or clear the filters." : "Add a product to start selling."}
          </EmptyState>
        ) : (
          <>
            <DataTable>
              <thead><tr><th>Product</th><th>Category</th><th className="text-right">Price</th><th className="text-right">Stock</th><th>Labels</th><th>Visible</th></tr></thead>
              <tbody>
                {products.map((p) => {
                  const cover = [...p.images].sort((a, b) => a.sort_order - b.sort_order)[0];
                  const stock = p.variants.filter((x) => x.is_active).reduce((n, x) => n + x.stock, 0);
                  const lowSizes = p.variants.filter((x) => x.is_active && x.stock <= low).length;
                  const labels = [p.is_featured && "Featured", p.is_new_arrival && "New", p.is_best_seller && "Best seller", p.is_luxury && "Luxury"].filter(Boolean);
                  return (
                    <tr key={p.id} className="hover:bg-linen/60">
                      <td>
                        <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                          <span className="relative h-14 w-11 shrink-0 overflow-hidden bg-champagne">
                            {cover && <Image src={imageUrl(cover.storage_path)} alt="" fill sizes="44px" className="object-cover" />}
                          </span>
                          <span className="font-medium hover:underline">{p.name}</span>
                        </Link>
                      </td>
                      <td className="text-cocoa">{(p.category as { name: string } | null)?.name}</td>
                      <td className="text-right tabular-nums">
                        {formatPKR(p.base_price)}
                        {p.compare_at_price && <s className="block text-xs text-cocoa">{formatPKR(p.compare_at_price)}</s>}
                      </td>
                      <td className="text-right tabular-nums">
                        {stock}
                        {lowSizes > 0 && <span className="block text-xs text-[#b7791f]">{lowSizes} size{lowSizes === 1 ? "" : "s"} low</span>}
                      </td>
                      <td className="text-xs text-cocoa">{labels.join(" · ") || "—"}</td>
                      <td><ProductVisibilityToggle id={p.id} active={p.is_active} name={p.name} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
            <Pagination page={page} pageCount={Math.max(1, Math.ceil((count ?? 0) / PAGE))} href={href} />
          </>
        )}
    </Card>
  );
}
