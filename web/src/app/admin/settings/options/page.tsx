import { Suspense } from "react";
import { OptionsManager } from "@/components/admin/options-manager";
import { SettingsTabs } from "@/components/admin/settings-tabs";
import { AdminPageHeader, Skeleton } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Sizes & Colours" };

export default function OptionsPage() {
  return (
    <>
      <AdminPageHeader title="Store Settings" description="The sizes and colours you can choose when adding a product." />
      <SettingsTabs active="options" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Options />
      </Suspense>
    </>
  );
}

const used = (rows: unknown) => (rows as { count: number }[])[0]?.count ?? 0;

async function Options() {
  const { supabase } = await requireAdmin();
  const [{ data: sizes }, { data: colors }] = await Promise.all([
    supabase.from("sizes").select("id, code, label, product_variants(count)").order("sort_order"),
    supabase.from("colors").select("id, name, hex, product_variants(count)").order("name"),
  ]);
  return (
    <OptionsManager
      sizes={(sizes ?? []).map((s) => ({ id: s.id, code: s.code, label: s.label, used: used(s.product_variants) }))}
      colors={(colors ?? []).map((c) => ({ id: c.id, name: c.name, hex: c.hex, used: used(c.product_variants) }))}
    />
  );
}
