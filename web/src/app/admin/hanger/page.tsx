import { Suspense } from "react";
import { HangerManager, type HangerProduct, type HangerState } from "@/components/admin/hanger-manager";
import { automaticRailProductIds } from "@/components/home/signature-rail";
import { AdminPageHeader, EmptyState, Skeleton } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { imageUrl } from "@/lib/catalog/supabase-source";

export const metadata = { title: "3D Hanger" };

export default function HangerPage() {
  return (
    <>
      <AdminPageHeader
        title="3D Hanger Management"
        description="Choose the pieces on the homepage rail, their photos and order, and which piece is featured in the middle. Changes go live when you publish."
      />
      <Suspense fallback={<Skeleton className="h-[40rem]" />}>
        <Hanger />
      </Suspense>
    </>
  );
}

async function Hanger() {
  const { supabase } = await requireAdmin();
  const [{ data: s }, { data: rows }, { data: products, error }, automatic] = await Promise.all([
    supabase.from("hanger_settings").select("*, featured:hanger_items(product_id)").eq("id", 1).single(),
    supabase.from("hanger_items").select("product_id, image_path, back_image_path, title, description, is_active").order("sort_order"),
    supabase.from("products")
      .select("id, name, slug, base_price, short_description, is_active, images:product_images(storage_path, sort_order), variants:product_variants(stock, is_active)")
      .order("name").limit(1000),
    automaticRailProductIds(),
  ]);
  if (error || !s) return <EmptyState title="Couldn't load the hanger">Please refresh the page.</EmptyState>;

  const catalog: HangerProduct[] = (products ?? []).map((p) => ({
    id: p.id, name: p.name, slug: p.slug, price: p.base_price, description: p.short_description ?? "", isActive: p.is_active,
    inStock: p.variants.some((v) => v.is_active && v.stock > 0),
    images: [...p.images].sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ path: i.storage_path, url: imageUrl(i.storage_path) })),
  }));
  const initial: HangerState = {
    settings: {
      is_enabled: s.is_enabled, eyebrow: s.eyebrow, heading: s.heading, subtitle: s.subtitle ?? "", caption: s.caption ?? "",
      cta_label: s.cta_label, cta_href: s.cta_href, max_items: s.max_items, autoplay: s.autoplay, interval_ms: s.interval_ms,
      featured_product_id: (s.featured as { product_id: string } | null)?.product_id ?? "",
    },
    items: (rows ?? []).map((r) => ({
      product_id: r.product_id, image_path: r.image_path ?? "", back_image_path: r.back_image_path ?? "",
      title: r.title ?? "", description: r.description ?? "", is_active: r.is_active,
    })),
  };
  return <HangerManager initial={initial} catalog={catalog} automatic={automatic} storageBase={imageUrl("")} />;
}
