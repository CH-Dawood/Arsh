import { Suspense } from "react";
import { BrandsManager } from "@/components/admin/brands-manager";
import { AdminPageHeader, Skeleton } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Brands & Labels" };

export default function BrandsPage() {
  return (
    <>
      <AdminPageHeader title="Brands & Labels" description="The brands and labels you can choose on each product. Disable one to hide it from the store without deleting it." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Brands />
      </Suspense>
    </>
  );
}

async function Brands() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("brands")
    .select("id, name, slug, description, is_active, is_featured, products(count)")
    .order("sort_order")
    .order("name");

  return (
    <BrandsManager
      brands={(data ?? []).map((b) => ({
        id: b.id, name: b.name, slug: b.slug, description: b.description, is_active: b.is_active, is_featured: b.is_featured,
        product_count: (b.products as unknown as { count: number }[])[0]?.count ?? 0,
      }))}
    />
  );
}
