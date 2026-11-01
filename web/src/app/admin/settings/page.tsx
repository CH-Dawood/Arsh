import { SettingsForm } from "@/components/admin/settings-form";
import { SettingsTabs } from "@/components/admin/settings-tabs";
import { Suspense } from "react";
import { AdminPageHeader, EmptyState, Skeleton } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { imageUrl } from "@/lib/catalog/supabase-source";

export const metadata = { title: "Store Settings" };

export default function SettingsPage() {
  return (
    <>
      <AdminPageHeader title="Store Settings" description="Everything here updates the website as soon as you save." />
      <SettingsTabs active="general" />
      <Suspense fallback={<Skeleton className="h-[40rem]" />}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  const { supabase } = await requireAdmin();
  const { data: s } = await supabase.from("store_settings").select("*").eq("id", 1).single();
  if (!s) return <EmptyState title="Settings not found">Run the database migrations to create the settings row.</EmptyState>;
  const str = (v: string | number | null) => (v === null ? "" : String(v));

  return (
      <SettingsForm
        logoUrl={s.logo_path ? imageUrl(s.logo_path) : null}
        initial={{
          store_name: s.store_name, tagline: str(s.tagline), logo_path: str(s.logo_path), contact_email: str(s.contact_email),
          contact_phone: str(s.contact_phone), address: str(s.address), whatsapp_number: str(s.whatsapp_number), whatsapp_message: str(s.whatsapp_message),
          instagram_url: str(s.instagram_url), tiktok_url: str(s.tiktok_url), facebook_url: str(s.facebook_url),
          free_shipping_threshold: str(s.free_shipping_threshold), shipping_fee: str(s.shipping_fee), low_stock_threshold: str(s.low_stock_threshold),
          store_open: s.store_open, closed_message: str(s.closed_message), cod_enabled: s.cod_enabled, bank_transfer_enabled: s.bank_transfer_enabled,
          bank_name: str(s.bank_name), bank_account_title: str(s.bank_account_title), bank_account_number: str(s.bank_account_number), bank_iban: str(s.bank_iban),
        }}
      />
  );
}
