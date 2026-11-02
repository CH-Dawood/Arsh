import { Suspense } from "react";
import { PoliciesManager } from "@/components/admin/policies-manager";
import { SettingsTabs } from "@/components/admin/settings-tabs";
import { AdminPageHeader, Skeleton } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { EDITABLE_PAGES } from "@/lib/policies";

export const metadata = { title: "Policies & Pages" };

export default function PoliciesPage() {
  return (
    <>
      <AdminPageHeader title="Store Settings" description="Write your store policies, About page and size guide here. The website shows the latest saved version." />
      <SettingsTabs active="policies" />
      <Suspense fallback={<Skeleton className="h-[36rem]" />}>
        <Policies />
      </Suspense>
    </>
  );
}

async function Policies() {
  const { supabase } = await requireAdmin();
  const slugs = EDITABLE_PAGES.map((p) => p.slug);
  const { data } = await supabase.from("content_pages").select("slug, title, body, is_published, updated_at").in("slug", slugs);
  // Footer order; a missing row still shows (it is created by the migrations, so this is a fallback).
  const policies = EDITABLE_PAGES.map((p) => data?.find((d) => d.slug === p.slug) ?? { slug: p.slug, title: p.title, body: "", is_published: true, updated_at: new Date(0).toISOString() });
  return <PoliciesManager policies={policies} />;
}
