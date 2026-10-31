import { Suspense } from "react";
import { CategoriesManager } from "@/components/admin/categories-manager";
import { AdminPageHeader, Skeleton } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { imageUrl } from "@/lib/catalog/supabase-source";

export const metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <>
      <AdminPageHeader title="Categories" description="Organise products into categories. Use the arrows to set the order shown in menus and filters." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Categories />
      </Suspense>
    </>
  );
}

async function Categories() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_path, is_active, products(count), home_sections(id)")
    .order("sort_order")
    .order("name");

  return (
    <CategoriesManager
      categories={(data ?? []).map((c) => ({
        id: c.id, name: c.name, slug: c.slug, description: c.description, image_path: c.image_path,
        image_url: c.image_path ? imageUrl(c.image_path) : null, is_active: c.is_active,
        product_count: (c.products as unknown as { count: number }[])[0]?.count ?? 0,
        on_homepage: (c.home_sections as unknown as { id: string }[]).length > 0,
      }))}
    />
  );
}
