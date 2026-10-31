"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { uploadCatalogImage } from "@/lib/admin/actions/products";
import { saveSettings, type SettingsInput } from "@/lib/admin/actions/settings";
import { toastResult } from "@/lib/admin/toast";
import { Toggle } from "./client";
import { AdminButton, Card, FieldRow, TextArea, TextInput } from "./ui";

type Values = { [K in keyof SettingsInput]-?: SettingsInput[K] extends boolean | undefined ? boolean : string };

export function SettingsForm({ initial, logoUrl }: { initial: Values; logoUrl: string | null }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [logo, setLogo] = useState(logoUrl);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof Values>(k: K) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));
  const flag = <K extends keyof Values>(k: K) => (x: boolean) => setV((s) => ({ ...s, [k]: x }));

  const text = (k: keyof Values, label: string, props: { hint?: string; type?: string; placeholder?: string; maxLength?: number; className?: string } = {}) => (
    <FieldRow label={label} htmlFor={`s-${k}`} hint={props.hint} error={errors[k]} className={props.className}>
      <TextInput id={`s-${k}`} type={props.type ?? "text"} value={v[k] as string} onChange={set(k)} placeholder={props.placeholder} maxLength={props.maxLength} aria-invalid={Boolean(errors[k])} />
    </FieldRow>
  );

  const uploadLogo = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", "branding");
    const res = await uploadCatalogImage(fd);
    setUploading(false);
    if (toastResult(res) && res.ok && res.data) {
      setV((s) => ({ ...s, logo_path: res.data!.path }));
      setLogo(res.data.url);
    }
  };

  return (
    <form
      className="space-y-6 pb-24"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveSettings(v);
          toastResult(res);
          setErrors(res.ok ? {} : (res.errors ?? {}));
          if (res.ok) router.refresh();
        });
      }}
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Store">
          <div className="grid gap-4 p-5">
            {text("store_name", "Store name *", { maxLength: 60 })}
            {text("tagline", "Tagline", { maxLength: 120, hint: "Shown in the footer and search results." })}
            <div>
              <p className="mb-1.5 text-xs font-medium text-cocoa">Logo</p>
              <div className="flex items-center gap-4">
                <span className="relative flex h-16 w-40 items-center justify-center overflow-hidden border border-hairline bg-ivory">
                  {logo ? <Image src={logo} alt="Store logo" fill sizes="160px" className="object-contain p-2" /> : <span className="font-display text-xl uppercase tracking-[0.3em]">{v.store_name}</span>}
                </span>
                <div className="space-y-1">
                  <label className="inline-flex h-9 cursor-pointer items-center gap-2 border border-hairline px-3 text-sm hover:border-espresso">
                    <ImagePlus className="size-4" aria-hidden /> {uploading ? "Uploading…" : logo ? "Replace logo" : "Upload logo"}
                    <input type="file" accept="image/png,image/webp,image/jpeg,image/avif" className="sr-only" onChange={(e) => uploadLogo(e.target.files?.[0])} />
                  </label>
                  {logo && <button type="button" className="block text-xs text-danger underline" onClick={() => { setLogo(null); setV((s) => ({ ...s, logo_path: "" })); }}>Use text logo</button>}
                  <p className="text-xs text-cocoa">Without a logo, the store name is shown as a wordmark.</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Availability">
          <div className="space-y-4 p-5">
            <Toggle checked={v.store_open} onChange={flag("store_open")} label="Store is open for orders" description="When closed, customers can browse but checkout is paused." />
            {!v.store_open && text("closed_message", "Message shown at checkout", { maxLength: 200, placeholder: "We're restocking and will be back on Monday." })}
            <div className="border-t border-hairline pt-4">
              <p className="mb-3 text-xs font-medium text-cocoa">Payment methods</p>
              <div className="space-y-4">
                <Toggle checked={v.cod_enabled} onChange={flag("cod_enabled")} label="Cash on Delivery" />
                <Toggle checked={v.bank_transfer_enabled} onChange={flag("bank_transfer_enabled")} label="Bank Transfer" description="Customers see your bank details and you confirm payment manually." />
                <p className="text-xs text-cocoa">Easypaisa, JazzCash and card payments need a verified merchant account and integration before they can be offered.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Shipping & stock (PKR)">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {text("shipping_fee", "Shipping charge", { type: "number", hint: "Charged below the free-shipping threshold." })}
            {text("free_shipping_threshold", "Free shipping from", { type: "number", hint: "Order amount after discounts." })}
            {text("low_stock_threshold", "Low-stock alert at", { type: "number", hint: "Sizes with this many or fewer left are flagged." })}
            <FieldRow label="Currency"><TextInput value="PKR (Pakistani Rupee)" disabled /></FieldRow>
          </div>
        </Card>

        <Card title="Contact & WhatsApp">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {text("contact_email", "Contact email", { type: "email" })}
            {text("contact_phone", "Contact phone", { maxLength: 30 })}
            {text("whatsapp_number", "WhatsApp business number", { placeholder: "92 300 1234567", hint: "Used by the floating chat button." })}
            {text("whatsapp_message", "Pre-filled chat message", { maxLength: 300 })}
            <FieldRow label="Store address" htmlFor="s-address" className="sm:col-span-2">
              <TextArea id="s-address" value={v.address as string} onChange={set("address")} maxLength={300} rows={2} />
            </FieldRow>
            <p className="text-xs text-cocoa sm:col-span-2">Automatic order messages are set up under <Link href="/admin/notifications" className="underline">WhatsApp</Link>.</p>
          </div>
        </Card>

        <Card title="Social media">
          <div className="grid gap-4 p-5">
            {text("instagram_url", "Instagram", { type: "url", placeholder: "https://instagram.com/yourbrand" })}
            {text("tiktok_url", "TikTok", { type: "url", placeholder: "https://www.tiktok.com/@yourbrand" })}
            {text("facebook_url", "Facebook", { type: "url", placeholder: "https://facebook.com/yourbrand" })}
          </div>
        </Card>

        <Card title="Bank transfer details">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {text("bank_name", "Bank name", { maxLength: 80 })}
            {text("bank_account_title", "Account title", { maxLength: 120 })}
            {text("bank_account_number", "Account number", { maxLength: 40 })}
            {text("bank_iban", "IBAN", { placeholder: "PK36SCBL0000001123456702" })}
          </div>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-paper/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-[90rem] justify-end px-4 py-3 sm:px-8">
          <AdminButton type="submit" disabled={pending || uploading}>{pending ? "Saving…" : "Save settings"}</AdminButton>
        </div>
      </div>
    </form>
  );
}
