"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Search, Star, Trash2, Undo2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { SignatureRailView, centreFeatured, railPhoto } from "@/components/home/signature-rail-view";
import type { RailGarment } from "@/components/ui/product-rail-gallery";
import { Sheet } from "@/components/ui/sheet";
import { saveHanger } from "@/lib/admin/actions/hanger";
import { uploadCatalogImage } from "@/lib/admin/actions/products";
import { toastResult } from "@/lib/admin/toast";
import { cn, formatPKR } from "@/lib/format";
import { Toggle } from "./client";
import { AdminButton, Card, EmptyState, FieldRow, TextArea, TextInput } from "./ui";

export interface HangerProduct {
  categoryHidden: boolean;
  id: string; name: string; slug: string; price: number; description: string; isActive: boolean; inStock: boolean;
  images: { path: string; url: string }[];
}
type Item = { product_id: string; image_path: string; back_image_path: string; title: string; description: string; is_active: boolean };
type Settings = {
  is_enabled: boolean; eyebrow: string; heading: string; subtitle: string; caption: string; cta_label: string; cta_href: string;
  max_items: number; autoplay: boolean; interval_ms: number; featured_product_id: string;
};
export type HangerState = { settings: Settings; items: Item[] };

const MIN_PIECES = 3;

export function HangerManager({ initial, catalog, automatic, storageBase }: { initial: HangerState; catalog: HangerProduct[]; automatic: string[]; storageBase: string }) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const byId = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);
  const url = (path: string) => (path.startsWith("https://") ? path : storageBase + path);
  const dirty = JSON.stringify(state) !== JSON.stringify(saved);
  const { settings: s, items } = state;

  const set = (patch: Partial<Settings>) => setState((x) => ({ ...x, settings: { ...x.settings, ...patch } }));
  const setItems = (fn: (list: Item[]) => Item[]) => setState((x) => {
    const next = fn(x.items);
    const featuredStillOk = next.some((i) => i.product_id === x.settings.featured_product_id && i.is_active);
    return { ...x, items: next, settings: featuredStillOk ? x.settings : { ...x.settings, featured_product_id: "" } };
  });
  const add = (id: string) => setItems((list) => [...list, { product_id: id, image_path: "", back_image_path: "", title: "", description: "", is_active: true }]);
  const move = (i: number, dir: -1 | 1) => setItems((list) => { const next = [...list]; [next[i], next[i + dir]] = [next[i + dir], next[i]]; return next; });

  // Why a chosen piece won't hang on the homepage (the rail skips it rather than breaking).
  const problem = (it: Item) => {
    const p = byId.get(it.product_id);
    if (!p) return "Product no longer exists";
    if (!it.is_active) return "Disabled";
    if (!p.isActive) return "Product is hidden in the store";
    if (p.categoryHidden) return "Its category is hidden";
    if (!p.inStock) return "Sold out";
    if (!it.image_path && !p.images.length) return "No photo";
    return null;
  };
  const showing = items.filter((it) => !problem(it)).slice(0, s.max_items);

  const garments: RailGarment[] = showing.map((it) => {
    const p = byId.get(it.product_id)!;
    const front = it.image_path ? url(it.image_path) : p.images[0]?.url;
    const back = it.back_image_path ? url(it.back_image_path) : it.image_path ? undefined : p.images[1]?.url;
    return {
      id: p.id, name: it.title || p.name, description: it.description || p.description, tag: formatPKR(p.price), href: `/products/${p.slug}`,
      image: front ? railPhoto(front) : undefined, backImage: back ? railPhoto(back) : undefined,
    };
  });
  const featured = s.featured_product_id && showing.some((it) => it.product_id === s.featured_product_id) ? s.featured_product_id : showing[0]?.product_id ?? null;
  const { ordered, rest } = centreFeatured(garments, featured);

  const publish = () =>
    start(async () => {
      // Pieces whose product was deleted meanwhile are dropped instead of failing the publish.
      const kept = items.filter((it) => byId.has(it.product_id));
      const res = await saveHanger({ settings: { ...s, featured_product_id: featured ?? "" }, items: kept });
      if (toastResult(res)) {
        const next = { items: kept, settings: { ...s, featured_product_id: featured ?? "" } };
        setState(next);
        setSaved(next);
        router.refresh();
      }
    });

  return (
    <div className="space-y-6 pb-24">
      {!saved.items.length && (
        <div className="flex flex-col gap-3 border border-gold/40 bg-paper p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>No pieces chosen yet, so the homepage picks them automatically (featured, then best-photographed products).</p>
          {!items.length && automatic.length > 0 && (
            <AdminButton size="sm" variant="outline" onClick={() => setItems(() => automatic.map((id) => ({ product_id: id, image_path: "", back_image_path: "", title: "", description: "", is_active: true })))}>
              Start from the current pieces
            </AdminButton>
          )}
        </div>
      )}

      <Card title="Live preview" actions={<span className="text-xs text-cocoa">{dirty ? "Unpublished changes" : "Matches the homepage"}</span>}>
        {!s.is_enabled ? (
          <EmptyState title="Section switched off">The hanger is hidden from the homepage. Turn it on under Section settings.</EmptyState>
        ) : ordered.length < MIN_PIECES ? (
          <EmptyState title={`Add at least ${MIN_PIECES} available pieces`}>
            With fewer, the homepage tops the rail up with automatic picks so it never looks empty.
          </EmptyState>
        ) : (
          <div className="pointer-events-auto overflow-hidden bg-ivory [&>section]:mt-0">
            <SignatureRailView key={`${ordered.map((g) => g.id + g.image).join()}|${rest}`} config={{ eyebrow: s.eyebrow, heading: s.heading, subtitle: s.subtitle || null, caption: s.caption || null, ctaLabel: s.cta_label, ctaHref: s.cta_href, autoplay: s.autoplay, interval: s.interval_ms }} items={ordered} restIndex={rest} />
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card
          title={`Pieces on the rail (${showing.length} shown of ${items.length})`}
          actions={<AdminButton size="sm" onClick={() => setPicking(true)}><Plus className="size-4" aria-hidden /> Add product</AdminButton>}
        >
          {!items.length ? (
            <EmptyState title="No pieces yet" action={<AdminButton onClick={() => setPicking(true)}>Choose products</AdminButton>}>Pick products from your catalogue to hang on the rail.</EmptyState>
          ) : (
            <ul className="divide-y divide-hairline">
              {items.map((it, i) => {
                const p = byId.get(it.product_id);
                const issue = problem(it);
                const thumb = it.image_path ? url(it.image_path) : p?.images[0]?.url;
                const isFeatured = featured === it.product_id;
                return (
                  <li key={it.product_id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap", issue && "bg-linen/50")}>
                    <div className="flex shrink-0 flex-col">
                      <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-7 place-items-center disabled:opacity-30" aria-label={`Move ${p?.name ?? "piece"} up`}><ArrowUp className="size-4" /></button>
                      <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="grid size-7 place-items-center disabled:opacity-30" aria-label={`Move ${p?.name ?? "piece"} down`}><ArrowDown className="size-4" /></button>
                    </div>
                    <span className="relative h-16 w-12 shrink-0 overflow-hidden bg-champagne">
                      {thumb && <Image src={thumb} alt="" fill sizes="48px" className="object-cover object-top" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{it.title || p?.name || "Deleted product"}</p>
                      <p className="text-xs text-cocoa">
                        {p ? formatPKR(p.price) : ""}{it.image_path ? " · custom photo" : ""}{it.title || it.description ? " · custom text" : ""}
                      </p>
                      {issue && <p className="text-xs text-[#b7791f]">Not shown: {issue}</p>}
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(issue)}
                      onClick={() => set({ featured_product_id: it.product_id })}
                      aria-pressed={isFeatured}
                      className={cn("inline-flex h-8 items-center gap-1.5 border px-2.5 text-xs disabled:opacity-40", isFeatured ? "border-gold-deep bg-gold-deep text-ivory" : "border-hairline hover:border-espresso")}
                    >
                      <Star className="size-3.5" aria-hidden fill={isFeatured ? "currentColor" : "none"} /> {isFeatured ? "Featured" : "Feature"}
                    </button>
                    <div className="w-28 shrink-0">
                      <Toggle checked={it.is_active} onChange={(x) => setItems((list) => list.map((y, j) => (j === i ? { ...y, is_active: x } : y)))} label={it.is_active ? "On" : "Off"} />
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <AdminButton size="sm" variant="ghost" onClick={() => setEditing(i)} aria-label={`Edit ${p?.name ?? "piece"}`}><Pencil className="size-4" /></AdminButton>
                      <AdminButton size="sm" variant="ghost" className="text-danger" onClick={() => setItems((list) => list.filter((_, j) => j !== i))} aria-label={`Remove ${p?.name ?? "piece"} from the rail`}><Trash2 className="size-4" /></AdminButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Section settings">
          <div className="space-y-4 p-5">
            <Toggle checked={s.is_enabled} onChange={(x) => set({ is_enabled: x })} label="Show the hanger on the homepage" />
            <FieldRow label="Small text above the heading" htmlFor="h-eyebrow"><TextInput id="h-eyebrow" maxLength={60} value={s.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} /></FieldRow>
            <FieldRow label="Heading *" htmlFor="h-heading"><TextInput id="h-heading" maxLength={80} value={s.heading} onChange={(e) => set({ heading: e.target.value })} /></FieldRow>
            <FieldRow label="Subtitle" htmlFor="h-sub"><TextArea id="h-sub" rows={2} maxLength={300} value={s.subtitle} onChange={(e) => set({ subtitle: e.target.value })} /></FieldRow>
            <FieldRow label="Hint under the rail" htmlFor="h-cap" hint="Shown when no piece faces the front."><TextInput id="h-cap" maxLength={200} value={s.caption} onChange={(e) => set({ caption: e.target.value })} /></FieldRow>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="Button text *" htmlFor="h-cta"><TextInput id="h-cta" maxLength={40} value={s.cta_label} onChange={(e) => set({ cta_label: e.target.value })} /></FieldRow>
              <FieldRow label="Button link *" htmlFor="h-href" hint="/shop, /collections/… or https://…"><TextInput id="h-href" maxLength={500} value={s.cta_href} onChange={(e) => set({ cta_href: e.target.value })} /></FieldRow>
            </div>
            <FieldRow label={`Pieces shown: ${s.max_items}`} htmlFor="h-max" hint="Between 3 and 12. Extra pieces wait in the list.">
              <input id="h-max" type="range" min={3} max={12} value={s.max_items} onChange={(e) => set({ max_items: Number(e.target.value) })} className="w-full accent-espresso" />
            </FieldRow>
            <Toggle checked={s.autoplay} onChange={(x) => set({ autoplay: x })} label="Turn pieces automatically" description="Stops as soon as a visitor interacts." />
            {s.autoplay && (
              <FieldRow label={`Speed: ${(s.interval_ms / 1000).toFixed(1)} seconds per piece`} htmlFor="h-speed">
                <input id="h-speed" type="range" min={2000} max={8000} step={200} value={s.interval_ms} onChange={(e) => set({ interval_ms: Number(e.target.value) })} className="w-full accent-espresso" />
              </FieldRow>
            )}
          </div>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-paper/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-[90rem] items-center justify-end gap-3 px-4 py-3 sm:px-8">
          {dirty && <span className="mr-auto text-xs text-cocoa">You have unpublished changes. The preview above shows them.</span>}
          <AdminButton variant="outline" disabled={!dirty || pending} onClick={() => setState(saved)}><Undo2 className="size-4" aria-hidden /> Discard</AdminButton>
          <AdminButton disabled={!dirty || pending} onClick={publish}>{pending ? "Publishing…" : "Publish changes"}</AdminButton>
        </div>
      </div>

      <ProductPicker open={picking} onClose={() => setPicking(false)} catalog={catalog} taken={new Set(items.map((i) => i.product_id))} onPick={(id) => add(id)} />

      {editing !== null && items[editing] && (
        <ItemEditor
          item={items[editing]}
          product={byId.get(items[editing].product_id)}
          url={url}
          onClose={() => setEditing(null)}
          onChange={(patch) => setItems((list) => list.map((y, j) => (j === editing ? { ...y, ...patch } : y)))}
        />
      )}
    </div>
  );
}

function ProductPicker({ open, onClose, catalog, taken, onPick }: { open: boolean; onClose: () => void; catalog: HangerProduct[]; taken: Set<string>; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const list = catalog.filter((p) => !taken.has(p.id) && (!term || p.name.toLowerCase().includes(term) || p.slug.includes(term))).slice(0, 60);
  return (
    <Sheet open={open} onClose={onClose} side="right" label="Add products to the rail" className="w-[min(100vw,30rem)]">
      <div className="flex h-full flex-col p-6 pt-12">
        <h2 className="text-2xl">Add products</h2>
        <label className="relative mt-4 block">
          <span className="sr-only">Search products</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cocoa" aria-hidden />
          <TextInput data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="pl-9" />
        </label>
        <ul className="mt-4 flex-1 divide-y divide-hairline overflow-y-auto">
          {list.length === 0 && <li className="py-10 text-center text-sm text-cocoa">{term ? "No products match." : "Every product is already on the rail."}</li>}
          {list.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              <span className="relative h-14 w-11 shrink-0 overflow-hidden bg-champagne">
                {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="44px" className="object-cover object-top" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{p.name}</span>
                <span className="text-xs text-cocoa">{formatPKR(p.price)}{!p.isActive ? " · hidden" : !p.inStock ? " · sold out" : ""}</span>
              </span>
              <AdminButton size="sm" variant="outline" onClick={() => onPick(p.id)}>Add</AdminButton>
            </li>
          ))}
        </ul>
        <AdminButton className="mt-4" onClick={onClose}>Done</AdminButton>
      </div>
    </Sheet>
  );
}

function ItemEditor({ item, product, url, onClose, onChange }: { item: Item; product?: HangerProduct; url: (p: string) => string; onClose: () => void; onChange: (patch: Partial<Item>) => void }) {
  const [busy, setBusy] = useState<"front" | "back" | null>(null);
  const upload = async (file: File | undefined, which: "front" | "back") => {
    if (!file) return;
    setBusy(which);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", "hanger");
    const res = await uploadCatalogImage(fd);
    setBusy(null);
    if (toastResult(res) && res.ok && res.data) onChange(which === "front" ? { image_path: res.data.path } : { back_image_path: res.data.path });
  };

  const slot = (which: "front" | "back") => {
    const key = which === "front" ? "image_path" : "back_image_path";
    const current = item[key];
    const fallback = which === "front" ? product?.images[0]?.url : item.image_path ? undefined : product?.images[1]?.url;
    const shown = current ? url(current) : fallback;
    return (
      <div>
        <p className="mb-1.5 text-xs font-medium text-cocoa">{which === "front" ? "Front photo" : "Back photo (shown when the piece turns)"}</p>
        <span className="relative block aspect-[200/310] w-full overflow-hidden bg-champagne">
          {shown && <Image src={shown} alt="" fill sizes="200px" className="object-contain object-top" />}
        </span>
        <p className="mt-1 text-xs text-cocoa">{current ? "Custom photo" : fallback ? "Product photo (default)" : "Front photo is reused"}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 border border-hairline px-2.5 text-xs hover:border-espresso">
            <ImagePlus className="size-3.5" aria-hidden /> {busy === which ? "Uploading…" : "Upload"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(e) => { upload(e.target.files?.[0], which); e.target.value = ""; }} />
          </label>
          {current && <button type="button" onClick={() => onChange({ [key]: "" })} className="text-xs underline">Use default</button>}
        </div>
        {!!product?.images.length && (
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`Choose a product photo for the ${which}`}>
            {product.images.map((img, n) => (
              <button key={img.path} type="button" onClick={() => onChange({ [key]: img.path })} aria-pressed={current === img.path}
                className={cn("relative h-12 w-9 overflow-hidden bg-champagne ring-offset-1", current === img.path && "ring-2 ring-espresso")} aria-label={`Product photo ${n + 1}`}>
                <Image src={img.url} alt="" fill sizes="36px" className="object-cover object-top" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet open onClose={onClose} side="right" label="Edit piece" className="w-[min(100vw,34rem)]">
      <div className="flex h-full flex-col overflow-y-auto p-6 pt-12">
        <h2 className="text-2xl">{product?.name ?? "Piece"}</h2>
        <p className="mt-1 text-sm text-cocoa">{product ? `${formatPKR(product.price)} · links to /products/${product.slug}` : "This product was deleted."}</p>
        <div className="mt-6 grid grid-cols-2 gap-4">{slot("front")}{slot("back")}</div>
        <p className="mt-2 text-xs text-cocoa">Best results: portrait photos of the whole outfit, about 2:3, with the garment at the top.</p>
        <div className="mt-6 space-y-4">
          <FieldRow label="Name on the rail" htmlFor="i-title" hint="Leave empty to use the product name.">
            <TextInput id="i-title" maxLength={150} value={item.title} placeholder={product?.name} onChange={(e) => onChange({ title: e.target.value })} />
          </FieldRow>
          <FieldRow label="Description on the rail" htmlFor="i-desc" hint="Leave empty to use the product's short description.">
            <TextArea id="i-desc" rows={3} maxLength={300} value={item.description} placeholder={product?.description} onChange={(e) => onChange({ description: e.target.value })} />
          </FieldRow>
        </div>
        <AdminButton className="mt-auto" onClick={onClose}>Done</AdminButton>
      </div>
    </Sheet>
  );
}
