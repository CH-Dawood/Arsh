import { Suspense } from "react";
import { SettingsTabs } from "@/components/admin/settings-tabs";
import { StorageManager } from "@/components/admin/storage-manager";
import { AdminPageHeader, EmptyState, Skeleton } from "@/components/admin/ui";
import { UNUSED_MIN_AGE_MS, catalogReferences, listCatalogFiles } from "@/lib/admin/storage";
import { requireAdmin } from "@/lib/auth";
import { imageUrl } from "@/lib/catalog/supabase-source";

export const metadata = { title: "Storage" };

export default function StoragePage() {
  return (
    <>
      <AdminPageHeader title="Store Settings" description="Uploaded images that nothing on your store uses. Nothing is deleted unless you choose it." />
      <SettingsTabs active="storage" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Storage />
      </Suspense>
    </>
  );
}

async function Storage() {
  const { supabase } = await requireAdmin();
  const [refs, files] = await Promise.all([catalogReferences(supabase), listCatalogFiles(supabase).catch(() => null)]);
  if (!refs || !files) return <EmptyState title="Couldn't check your files">Please refresh the page. Nothing was changed.</EmptyState>;

  const now = new Date().getTime();
  const unused = files.filter((f) => !refs.has(f.path)).map((f) => ({
    path: f.path, url: imageUrl(f.path), size: f.size, createdAt: f.createdAt,
    tooNew: !f.createdAt || now - new Date(f.createdAt).getTime() < UNUSED_MIN_AGE_MS,
  }));
  return <StorageManager total={files.length} unused={unused} />;
}
