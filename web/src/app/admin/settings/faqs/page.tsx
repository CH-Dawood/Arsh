import { Suspense } from "react";
import { FaqManager } from "@/components/admin/faq-manager";
import { SettingsTabs } from "@/components/admin/settings-tabs";
import { AdminPageHeader, Skeleton } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "FAQ Management" };

export default function FaqsAdminPage() {
  return (
    <>
      <AdminPageHeader title="Store Settings" description="Questions and answers for the FAQ page. Changes appear on the website as soon as you save." />
      <SettingsTabs active="faqs" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Faqs />
      </Suspense>
    </>
  );
}

async function Faqs() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("faq_items").select("id, question, answer, is_active").order("sort_order").order("created_at");
  return <FaqManager faqs={data ?? []} />;
}
