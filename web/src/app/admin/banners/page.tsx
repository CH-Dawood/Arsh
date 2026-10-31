import { Suspense } from "react";
import { BannersManager, type BannerRow } from "@/components/admin/banners-manager";
import { AdminPageHeader, EmptyState, Skeleton, formatDateTime } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { imageUrl } from "@/lib/catalog/supabase-source";

export const metadata = { title: "Homepage Banners" };

export default function BannersPage() {
  return (
    <>
      <AdminPageHeader title="Homepage Banners" description="The slides at the top of your homepage. They rotate every 4 seconds in the order shown here." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Banners />
      </Suspense>
    </>
  );
}

async function Banners() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("banners")
    .select("id, title, heading, subheading, promo_text, cta_label, cta_href, image_path, mobile_image_path, alt, is_active, starts_at, ends_at")
    .order("sort_order")
    .order("created_at");
  if (error) return <EmptyState title="Couldn't load banners">Please refresh the page.</EmptyState>;
  const rows: BannerRow[] = (data ?? []).map((b) => ({
    ...b,
    image_url: imageUrl(b.image_path),
    mobile_image_url: b.mobile_image_path ? imageUrl(b.mobile_image_path) : null,
    scheduled: scheduleNote(b.starts_at, b.ends_at),
  }));
  return <BannersManager banners={rows} />;
}

/** Older banners may carry a schedule; say so rather than leave a "live" banner mysteriously missing. */
function scheduleNote(startsAt: string | null, endsAt: string | null) {
  const now = Date.now();
  if (startsAt && new Date(startsAt).getTime() > now) return `Starts ${formatDateTime(startsAt)}`;
  if (endsAt && new Date(endsAt).getTime() <= now) return `Ended ${formatDateTime(endsAt)}`;
  return null;
}
