"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { HeroSlider } from "@/components/home/hero-slider";
import { Sheet } from "@/components/ui/sheet";
import { deleteBanner, reorderBanners, saveBanner, setBannerActive } from "@/lib/admin/actions/banners";
import { uploadCatalogImage } from "@/lib/admin/actions/products";
import { toastResult } from "@/lib/admin/toast";
import type { Banner } from "@/lib/catalog/types";
import { ConfirmDialog, Toggle } from "./client";
import { AdminButton, Card, EmptyState, FieldRow, TextArea, TextInput } from "./ui";

export interface BannerRow {
  id: string; title: string | null; heading: string; subheading: string | null; promo_text: string | null;
  cta_label: string | null; cta_href: string | null; image_path: string; image_url: string;
  mobile_image_path: string | null; mobile_image_url: string | null; alt: string; is_active: boolean;
  scheduled: string | null;
}

type Draft = Omit<BannerRow, "id" | "scheduled"> & { id?: string };
const blank: Draft = {
  title: "", heading: "", subheading: "", promo_text: "", cta_label: "Shop now", cta_href: "/shop",
  image_path: "", image_url: "", mobile_image_path: null, mobile_image_url: null, alt: "", is_active: true,
};

const toBanner = (b: Draft & { id?: string }): Banner => ({
  id: b.id ?? "draft", heading: b.heading || "Your heading", subheading: b.subheading || null, promoText: b.promo_text || null,
  ctaLabel: b.cta_label || null, ctaHref: b.cta_href || null,
  image: { url: b.image_url, alt: b.alt || b.heading },
  mobileImage: b.mobile_image_url ? { url: b.mobile_image_url, alt: b.alt || b.heading } : null,
});

export function BannersManager({ banners }: { banners: BannerRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<BannerRow | null>(null);
  const [uploading, setUploading] = useState<"desktop" | "mobile" | null>(null);
  const [preview, setPreview] = useState<Banner[] | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    start(async () => {
      if (toastResult(await fn())) {
        after?.();
        router.refresh();
      }
    });

  const move = (i: number, dir: -1 | 1) => {
    const ids = banners.map((b) => b.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    run(() => reorderBanners(ids));
  };

  const upload = async (file: File | undefined, which: "desktop" | "mobile") => {
    if (!file || !draft) return;
    setUploading(which);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", "banners");
    const res = await uploadCatalogImage(fd);
    setUploading(null);
    if (toastResult(res) && res.ok && res.data) {
      const { path, url } = res.data;
      setDraft((d) => d && (which === "desktop" ? { ...d, image_path: path, image_url: url } : { ...d, mobile_image_path: path, mobile_image_url: url }));
    }
  };

  const live = banners.filter((b) => b.is_active && !b.scheduled);

  return (
    <>
      <Card
        title={`${banners.length} banner${banners.length === 1 ? "" : "s"} · ${live.length} live`}
        actions={
          <div className="flex gap-2">
            <AdminButton size="sm" variant="outline" disabled={!live.length} onClick={() => setPreview(live.map(toBanner))}><Eye className="size-4" aria-hidden /> Preview slider</AdminButton>
            <AdminButton size="sm" onClick={() => setDraft({ ...blank })}><Plus className="size-4" aria-hidden /> Add banner</AdminButton>
          </div>
        }
      >
        {banners.length === 0 ? (
          <EmptyState title="No banners yet" action={<AdminButton onClick={() => setDraft({ ...blank })}>Add your first banner</AdminButton>}>
            Banners rotate at the top of your homepage every few seconds.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-hairline">
            {banners.map((b, i) => (
              <li key={b.id} className="flex flex-wrap items-center gap-4 px-4 py-3 sm:flex-nowrap">
                <div className="flex shrink-0 flex-col">
                  <button type="button" disabled={i === 0 || pending} onClick={() => move(i, -1)} className="grid size-8 place-items-center disabled:opacity-30" aria-label={`Move ${b.heading} up`}><ArrowUp className="size-4" /></button>
                  <button type="button" disabled={i === banners.length - 1 || pending} onClick={() => move(i, 1)} className="grid size-8 place-items-center disabled:opacity-30" aria-label={`Move ${b.heading} down`}><ArrowDown className="size-4" /></button>
                </div>
                <span className="relative aspect-[16/9] w-32 shrink-0 overflow-hidden bg-champagne sm:w-40">
                  <Image src={b.image_url} alt="" fill sizes="160px" className="object-cover object-[50%_18%]" />
                  {b.mobile_image_url && <span className="absolute bottom-1 right-1 bg-espresso/80 px-1.5 py-0.5 text-[10px] text-ivory">+ phone image</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{b.heading}</p>
                  <p className="truncate text-xs text-cocoa">
                    {b.title ? `${b.title} · ` : ""}{b.cta_label ? `“${b.cta_label}” → ${b.cta_href}` : "No button"}
                  </p>
                  {b.scheduled && <p className="text-xs text-[#b7791f]">{b.scheduled}</p>}
                </div>
                <div className="w-36 shrink-0">
                  <Toggle checked={b.is_active} disabled={pending} onChange={(x) => run(() => setBannerActive(b.id, x))} label={b.is_active ? "Live" : "Hidden"} />
                </div>
                <div className="flex shrink-0 gap-1">
                  <AdminButton size="sm" variant="ghost" onClick={() => setDraft({ ...b })} aria-label={`Edit ${b.heading}`}><Pencil className="size-4" /></AdminButton>
                  <AdminButton size="sm" variant="ghost" className="text-danger" onClick={() => setToDelete(b)} aria-label={`Delete ${b.heading}`}><Trash2 className="size-4" /></AdminButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Sheet open={draft !== null} onClose={() => setDraft(null)} side="right" label={draft?.id ? "Edit banner" : "Add banner"} className="w-[min(100vw,34rem)]">
        {draft && (
          <form
            className="flex h-full flex-col overflow-y-auto p-6 pt-12"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => saveBanner({
                id: draft.id, title: draft.title ?? "", heading: draft.heading, subheading: draft.subheading ?? "", promo_text: draft.promo_text ?? "",
                cta_label: draft.cta_label ?? "", cta_href: draft.cta_href ?? "", image_path: draft.image_path,
                mobile_image_path: draft.mobile_image_path ?? "", alt: draft.alt, is_active: draft.is_active,
              }), () => setDraft(null));
            }}
          >
            <h2 className="text-2xl">{draft.id ? "Edit banner" : "Add banner"}</h2>
            <div className="mt-6 space-y-4">
              <FieldRow label="Banner name (only you see this)" htmlFor="b-title">
                <TextInput id="b-title" maxLength={80} value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Eid 2026 launch" />
              </FieldRow>

              <div className="grid gap-4 sm:grid-cols-2">
                <ImagePick label="Desktop image *" hint="Wide photo, 1600 × 1000 or larger." url={draft.image_url} busy={uploading === "desktop"} onFile={(f) => upload(f, "desktop")} />
                <ImagePick label="Phone image (optional)" hint="Portrait, about 900 × 1400. Without it the desktop image is cropped." url={draft.mobile_image_url} busy={uploading === "mobile"} onFile={(f) => upload(f, "mobile")}
                  onRemove={draft.mobile_image_url ? () => setDraft({ ...draft, mobile_image_path: null, mobile_image_url: null }) : undefined} />
              </div>

              <FieldRow label="Small text above the heading" htmlFor="b-promo">
                <TextInput id="b-promo" maxLength={80} value={draft.promo_text ?? ""} onChange={(e) => setDraft({ ...draft, promo_text: e.target.value })} placeholder="New season" />
              </FieldRow>
              <FieldRow label="Heading *" htmlFor="b-heading">
                <TextInput id="b-heading" required maxLength={80} value={draft.heading} onChange={(e) => setDraft({ ...draft, heading: e.target.value })} />
              </FieldRow>
              <FieldRow label="Description" htmlFor="b-sub">
                <TextArea id="b-sub" maxLength={200} rows={2} value={draft.subheading ?? ""} onChange={(e) => setDraft({ ...draft, subheading: e.target.value })} />
              </FieldRow>
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldRow label="Button text" htmlFor="b-cta">
                  <TextInput id="b-cta" maxLength={30} value={draft.cta_label ?? ""} onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })} />
                </FieldRow>
                <FieldRow label="Button link" htmlFor="b-href" hint="/collections/new-arrivals or https://…">
                  <TextInput id="b-href" maxLength={500} value={draft.cta_href ?? ""} onChange={(e) => setDraft({ ...draft, cta_href: e.target.value })} />
                </FieldRow>
              </div>
              <FieldRow label="Image description (for screen readers)" htmlFor="b-alt" hint="Defaults to the heading.">
                <TextInput id="b-alt" maxLength={200} value={draft.alt} onChange={(e) => setDraft({ ...draft, alt: e.target.value })} />
              </FieldRow>
              <Toggle checked={draft.is_active} onChange={(x) => setDraft({ ...draft, is_active: x })} label="Show on the homepage" />
            </div>
            <div className="mt-auto flex flex-wrap justify-end gap-2 pt-8">
              <AdminButton variant="outline" disabled={!draft.image_url} onClick={() => setPreview([toBanner(draft)])}><Eye className="size-4" aria-hidden /> Preview</AdminButton>
              <AdminButton variant="outline" onClick={() => setDraft(null)}>Cancel</AdminButton>
              <AdminButton type="submit" disabled={pending || uploading !== null || !draft.image_path}>{pending ? "Saving…" : draft.id ? "Save banner" : "Add banner"}</AdminButton>
            </div>
          </form>
        )}
      </Sheet>

      <Sheet open={preview !== null} onClose={() => setPreview(null)} side="center" label="Banner preview" className="w-[min(96vw,80rem)]">
        {preview && (
          <div className="max-h-[90dvh] overflow-y-auto">
            <p className="px-5 pb-3 pt-4 text-xs text-cocoa">Preview: this is how the homepage slider looks. Nothing is published until you save.</p>
            <HeroSlider banners={preview} />
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete “${toDelete?.heading}”?`}
        destructive
        confirmLabel="Delete banner"
        pending={pending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && run(() => deleteBanner(toDelete.id), () => setToDelete(null))}
      >
        The banner and its uploaded images are removed. To take it down temporarily, switch it to Hidden instead.
      </ConfirmDialog>
    </>
  );
}

function ImagePick({ label, hint, url, busy, onFile, onRemove }: { label: string; hint: string; url: string | null; busy: boolean; onFile: (f: File | undefined) => void; onRemove?: () => void }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-cocoa">{label}</p>
      <span className="relative block aspect-[4/3] w-full overflow-hidden bg-champagne">
        {url && <Image src={url} alt="" fill sizes="240px" className="object-cover" />}
      </span>
      <div className="mt-2 flex items-center gap-3">
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 border border-hairline px-3 text-sm hover:border-espresso">
          <ImagePlus className="size-4" aria-hidden /> {busy ? "Uploading…" : url ? "Replace" : "Upload"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {onRemove && <button type="button" onClick={onRemove} className="text-xs text-danger underline">Remove</button>}
      </div>
      <p className="mt-1 text-xs text-cocoa/80">{hint}</p>
    </div>
  );
}
