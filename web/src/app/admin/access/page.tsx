import { Suspense } from "react";
import { AccessManager } from "@/components/admin/access-manager";
import { AdminPageHeader, Skeleton } from "@/components/admin/ui";
import { getCurrentUser, requireAdmin } from "@/lib/auth";

export const metadata = { title: "Admin Access" };

export default function AccessPage() {
  return (
    <>
      <AdminPageHeader title="Admin Access" description="Two accounts can manage this store: yours and one more that you authorise." />
      <Suspense fallback={<Skeleton className="h-80" />}>
        <Access />
      </Suspense>
    </>
  );
}

async function Access() {
  const { supabase } = await requireAdmin();
  const [{ data }, user] = await Promise.all([supabase.rpc("admin_access_list"), getCurrentUser()]);
  const rows = data ?? [];
  // Display only: the database itself refuses changes from anyone but the owner.
  const isOwner = rows.some((r) => r.is_owner && r.email === user?.email?.toLowerCase());
  return <AccessManager rows={rows} isOwner={isOwner} />;
}
