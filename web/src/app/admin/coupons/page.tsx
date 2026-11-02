import { Suspense } from "react";
import { CouponsManager } from "@/components/admin/coupons-manager";
import { AdminPageHeader, Skeleton } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Coupons" };

export default function CouponsPage() {
  return (
    <>
      <AdminPageHeader title="Coupons" description="Discount codes customers can enter at checkout. Discounts and limits are checked on the server when an order is placed." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Coupons />
      </Suspense>
    </>
  );
}

async function Coupons() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("coupons")
    .select("id, code, description, discount_type, value, max_discount, min_order_amount, starts_at, expires_at, usage_limit, per_customer_limit, times_used, is_active")
    .order("created_at", { ascending: false });
  return <CouponsManager coupons={data ?? []} />;
}
