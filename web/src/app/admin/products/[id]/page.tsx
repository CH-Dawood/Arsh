import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { ProductForm } from "@/components/admin/product-form";
import { AdminPageHeader, PageSkeleton } from "@/components/admin/ui";
import { productFormOptions } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/auth";
import { imageUrl } from "@/lib/catalog/supabase-source";

export const metadata = { title: "Edit product" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: Pick<PageProps<"/admin/products/[id]">, "params">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: p }, options] = await Promise.all([
    supabase.from("products").select("*, images:product_images(id, storage_path, alt, sort_order), variants:product_variants(id, size_id, color_id, sku, stock, is_active, size:sizes(sort_order))").eq("id", id).maybeSingle(),
    productFormOptions(),
  ]);
  if (!p) notFound();

  return (
    <>
      <AdminPageHeader
        title={p.name}
        description="Edit the product. Saving updates the website straight away."
        actions={<Link href={`/products/${p.slug}`} target="_blank" className="inline-flex h-10 items-center gap-2 border border-hairline bg-paper px-4 text-sm hover:border-espresso"><ExternalLink className="size-4" aria-hidden /> View in store</Link>}
      />
      <ProductForm
        {...options}
        initial={{
          id: p.id, name: p.name, slug: p.slug, category_id: p.category_id, brand_id: p.brand_id ?? "",
          // Form shows the original price as "regular" and what the customer pays as "sale".
          regular_price: String(p.compare_at_price ?? p.base_price), sale_price: p.compare_at_price ? String(p.base_price) : "",
          short_description: p.short_description ?? "", description: p.description ?? "", fabric: p.fabric ?? "",
          embroidery: p.embroidery ?? "", care_instructions: p.care_instructions ?? "", piece_count: p.piece_count ? String(p.piece_count) : "",
          is_active: p.is_active, is_featured: p.is_featured, is_new_arrival: p.is_new_arrival, is_best_seller: p.is_best_seller, is_luxury: p.is_luxury,
          seo_title: p.seo_title ?? "", seo_description: p.seo_description ?? "",
          images: [...p.images].sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ id: i.id, storage_path: i.storage_path, url: imageUrl(i.storage_path), alt: i.alt ?? "" })),
          variants: [...p.variants]
            .sort((a, b) => ((a.size as { sort_order: number } | null)?.sort_order ?? 0) - ((b.size as { sort_order: number } | null)?.sort_order ?? 0))
            .map((x) => ({ id: x.id, size_id: x.size_id, color_id: x.color_id ?? "", sku: x.sku, stock: x.stock, is_active: x.is_active })),
        }}
      />
    </>
  );
}
