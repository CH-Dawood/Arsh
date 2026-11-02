"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ImagePlus, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { deleteProduct, saveProduct, uploadCatalogImage, type ProductInput } from "@/lib/admin/actions/products";
import { toastResult, useToasts } from "@/lib/admin/toast";
import { cn } from "@/lib/format";
import { ConfirmDialog, Toggle } from "./client";
import { AdminButton, Card, FieldRow, SelectInput, TextArea, TextInput } from "./ui";

type Option = { id: string; name: string; hidden?: boolean };
type Img = { id?: string; storage_path: string; url: string; alt: string };
type Variant = { key: string; id?: string; size_id: string; color_id: string; sku: string; stock: number; is_active: boolean };

export interface ProductFormValue {
  id?: string;
  name: string; slug: string; category_id: string; brand_id: string;
  regular_price: string; sale_price: string;
  short_description: string; description: string; fabric: string; embroidery: string; care_instructions: string; piece_count: string;
  is_active: boolean; is_featured: boolean; is_new_arrival: boolean; is_best_seller: boolean; is_luxury: boolean;
  seo_title: string; seo_description: string;
  images: Img[];
  variants: Omit<Variant, "key">[];
}

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 120);
const skuPrefix = (slug: string) => slug.split("-").filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 6) || "SKU";
let keySeq = 0;
const withKey = (v: Omit<Variant, "key">): Variant => ({ ...v, key: `v${++keySeq}` });

export function ProductForm({ initial, categories, brands, sizes, colors }: {
  initial: ProductFormValue;
  categories: Option[];
  brands: Option[];
  sizes: (Option & { code: string })[];
  colors: Option[];
}) {
  const router = useRouter();
  const push = useToasts((s) => s.push);
  const [v, setV] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [images, setImages] = useState<Img[]>(initial.images);
  const [variants, setVariants] = useState<Variant[]>(() => initial.variants.map(withKey));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSave] = useTransition();
  const [uploading, setUploading] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ProductFormValue>(k: K, value: ProductFormValue[K]) => setV((s) => ({ ...s, [k]: value }));
  const sizeCode = (id: string) => sizes.find((s) => s.id === id)?.code ?? "";
  const colorName = (id: string) => colors.find((c) => c.id === id)?.name ?? "";
  const makeSku = (sizeId: string, colorId: string) =>
    [skuPrefix(v.slug), sizeCode(sizeId), colorName(colorId).slice(0, 3).toUpperCase()].filter(Boolean).join("-");

  const addSize = (sizeId: string) => {
    const colorId = variants[0]?.color_id ?? "";
    setVariants((rows) => [...rows, withKey({ size_id: sizeId, color_id: colorId, sku: makeSku(sizeId, colorId), stock: 0, is_active: true })]);
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 12 - images.length);
    setUploading((n) => n + list.length);
    for (const file of list) {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("folder", "products");
      const res = await uploadCatalogImage(fd);
      if (res.ok && res.data) setImages((imgs) => [...imgs, { storage_path: res.data!.path, url: res.data!.url, alt: "" }]);
      else push("error", `${file.name}: ${res.message}`);
      setUploading((n) => n - 1);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const move = (i: number, dir: -1 | 1) =>
    setImages((imgs) => {
      const next = [...imgs];
      const j = i + dir;
      if (j < 0 || j >= next.length) return imgs;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const submit = () =>
    startSave(async () => {
      const payload: ProductInput = {
        ...v,
        id: v.id,
        images: images.map(({ id, storage_path, alt }) => ({ id, storage_path, alt })),
        variants: variants.map(({ id, size_id, color_id, sku, stock, is_active }) => ({ id, size_id, color_id, sku, stock, is_active })),
      };
      const res = await saveProduct(payload);
      toastResult(res);
      if (!res.ok) return setErrors(res.errors ?? {});
      setErrors({});
      if (!v.id && res.data) router.replace(`/admin/products/${res.data.id}`);
      else router.refresh();
    });

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-6 pb-24">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card title="Basics">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <FieldRow label="Product name *" htmlFor="p-name" error={errors.name} className="sm:col-span-2">
                <TextInput id="p-name" value={v.name} required maxLength={150}
                  onChange={(e) => { set("name", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
              </FieldRow>
              <FieldRow label="URL name *" htmlFor="p-slug" error={errors.slug} hint={`Shown as /products/${v.slug || "your-product"}`} className="sm:col-span-2">
                <TextInput id="p-slug" value={v.slug} required onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
              </FieldRow>
              <FieldRow label="Category *" htmlFor="p-cat" error={errors.category_id}>
                <SelectInput id="p-cat" value={v.category_id} onChange={(e) => set("category_id", e.target.value)} required>
                  <option value="">Choose…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectInput>
                {categories.find((c) => c.id === v.category_id)?.hidden && (
                  <p role="alert" className="mt-1 text-xs text-danger">This category is hidden, so this product won&apos;t appear in the store or be available at checkout until the category is shown.</p>
                )}
              </FieldRow>
              <FieldRow label="Brand / label" htmlFor="p-brand">
                <SelectInput id="p-brand" value={v.brand_id} onChange={(e) => set("brand_id", e.target.value)}>
                  <option value="">None</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </SelectInput>
              </FieldRow>
              <FieldRow label="Short description" htmlFor="p-short" hint="One or two lines shown near the price." className="sm:col-span-2">
                <TextArea id="p-short" value={v.short_description} maxLength={300} rows={2} onChange={(e) => set("short_description", e.target.value)} />
              </FieldRow>
              <FieldRow label="Full description" htmlFor="p-desc" className="sm:col-span-2">
                <TextArea id="p-desc" value={v.description} maxLength={5000} rows={5} onChange={(e) => set("description", e.target.value)} />
              </FieldRow>
            </div>
          </Card>

          <Card title={`Photos (${images.length}/12)`} actions={uploading > 0 && <span className="flex items-center gap-2 text-xs text-cocoa"><LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Uploading {uploading}…</span>}>
            <div className="p-5">
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((img, i) => (
                  <li key={img.storage_path} className="border border-hairline bg-ivory">
                    <div className="relative aspect-[3/4] bg-champagne">
                      <Image src={img.url} alt={img.alt || `Photo ${i + 1}`} fill sizes="200px" className="object-cover" />
                      {i === 0 && <span className="absolute left-2 top-2 bg-espresso px-2 py-0.5 text-[10px] uppercase tracking-wide text-ivory">Cover</span>}
                    </div>
                    <div className="space-y-2 p-2">
                      <label className="sr-only" htmlFor={`alt-${i}`}>Description of photo {i + 1}</label>
                      <TextInput id={`alt-${i}`} value={img.alt} placeholder="Describe the photo" maxLength={200} className="h-8 text-xs"
                        onChange={(e) => setImages((all) => all.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
                      <div className="flex justify-between">
                        <div className="flex">
                          <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="grid size-8 place-items-center disabled:opacity-30" aria-label={`Move photo ${i + 1} earlier`}><ArrowLeft className="size-4" /></button>
                          <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="grid size-8 place-items-center disabled:opacity-30" aria-label={`Move photo ${i + 1} later`}><ArrowRight className="size-4" /></button>
                        </div>
                        <button type="button" onClick={() => setImages((all) => all.filter((_, j) => j !== i))} className="grid size-8 place-items-center text-danger" aria-label={`Remove photo ${i + 1}`}><Trash2 className="size-4" /></button>
                      </div>
                    </div>
                  </li>
                ))}
                {images.length < 12 && (
                  <li>
                    <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-taupe text-center text-xs text-cocoa hover:border-espresso hover:text-espresso">
                      <ImagePlus className="size-6" strokeWidth={1.4} aria-hidden />
                      Add photos
                      <span className="text-[10px]">JPEG, PNG, WebP or AVIF · up to 5 MB</span>
                      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
                    </label>
                  </li>
                )}
              </ul>
              {images.length === 0 && <p className="mt-3 text-xs text-cocoa">Products without photos show a plain placeholder in the store.</p>}
            </div>
          </Card>

          <Card title="Sizes, colours & stock">
            <div className="p-5">
              {variants.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] text-sm">
                    <thead className="text-left text-xs text-cocoa"><tr><th className="pb-2 font-medium">Size</th><th className="pb-2 font-medium">Colour</th><th className="pb-2 font-medium">SKU</th><th className="pb-2 font-medium">Stock</th><th className="pb-2 font-medium">Sell</th><th /></tr></thead>
                    <tbody>
                      {variants.map((row, i) => {
                        const update = (patch: Partial<Variant>) => setVariants((rows) => rows.map((r) => (r.key === row.key ? { ...r, ...patch } : r)));
                        return (
                          <tr key={row.key} className="align-top">
                            <td className="pb-2 pr-2">
                              <SelectInput aria-label={`Size, row ${i + 1}`} value={row.size_id} onChange={(e) => update({ size_id: e.target.value })}>
                                <option value="">Size…</option>
                                {sizes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </SelectInput>
                            </td>
                            <td className="pb-2 pr-2">
                              <SelectInput aria-label={`Colour, row ${i + 1}`} value={row.color_id} onChange={(e) => update({ color_id: e.target.value })}>
                                <option value="">No colour</option>
                                {colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </SelectInput>
                            </td>
                            <td className="pb-2 pr-2"><TextInput aria-label={`SKU, row ${i + 1}`} value={row.sku} maxLength={64} onChange={(e) => update({ sku: e.target.value.toUpperCase() })} /></td>
                            <td className="pb-2 pr-2"><TextInput aria-label={`Stock, row ${i + 1}`} type="number" min={0} value={row.stock} className="w-24" onChange={(e) => update({ stock: Math.max(0, Number.parseInt(e.target.value, 10) || 0) })} /></td>
                            <td className="pb-2 pr-2 pt-2.5"><input type="checkbox" aria-label={`Sell this size, row ${i + 1}`} checked={row.is_active} onChange={(e) => update({ is_active: e.target.checked })} className="size-4 accent-espresso" /></td>
                            <td className="pb-2"><button type="button" onClick={() => setVariants((rows) => rows.filter((r) => r.key !== row.key))} className="grid size-10 place-items-center text-danger" aria-label={`Remove row ${i + 1}`}><Trash2 className="size-4" /></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {errors.variants && <p className="mb-2 text-xs text-danger">{errors.variants}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-cocoa">Add:</span>
                {sizes.map((s) => (
                  <button key={s.id} type="button" onClick={() => addSize(s.id)} className="inline-flex h-8 items-center gap-1 border border-hairline px-2.5 text-xs hover:border-espresso">
                    <Plus className="size-3" aria-hidden /> {s.code === "UNSTITCHED" ? "Unstitched" : s.code}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-cocoa">Stock changes here are saved in the inventory history as “Product editor”.</p>
            </div>
          </Card>

          <Card title="Fabric & care">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <FieldRow label="Fabric" htmlFor="p-fabric"><TextInput id="p-fabric" value={v.fabric} maxLength={300} onChange={(e) => set("fabric", e.target.value)} placeholder="Lawn shirt, cambric trouser…" /></FieldRow>
              <FieldRow label="Pieces" htmlFor="p-pieces">
                <SelectInput id="p-pieces" value={v.piece_count} onChange={(e) => set("piece_count", e.target.value)}>
                  <option value="">Not set</option><option value="1">1-piece</option><option value="2">2-piece</option><option value="3">3-piece</option>
                </SelectInput>
              </FieldRow>
              <FieldRow label="Embroidery" htmlFor="p-emb" className="sm:col-span-2"><TextInput id="p-emb" value={v.embroidery} maxLength={500} onChange={(e) => set("embroidery", e.target.value)} /></FieldRow>
              <FieldRow label="Care instructions" htmlFor="p-care" className="sm:col-span-2"><TextArea id="p-care" value={v.care_instructions} maxLength={1000} rows={2} onChange={(e) => set("care_instructions", e.target.value)} /></FieldRow>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Pricing (PKR)">
            <div className="grid gap-4 p-5">
              <FieldRow label="Regular price *" htmlFor="p-price" error={errors.regular_price}>
                <TextInput id="p-price" type="number" min={1} step={1} inputMode="numeric" value={v.regular_price} onChange={(e) => set("regular_price", e.target.value)} required />
              </FieldRow>
              <FieldRow label="Sale price" htmlFor="p-sale" error={errors.sale_price} hint="Optional. Shown with the regular price struck through.">
                <TextInput id="p-sale" type="number" min={1} step={1} inputMode="numeric" value={v.sale_price} onChange={(e) => set("sale_price", e.target.value)} />
              </FieldRow>
            </div>
          </Card>

          <Card title="Visibility & labels">
            <div className="space-y-4 p-5">
              <Toggle checked={v.is_active} onChange={(x) => set("is_active", x)} label="Visible in store" description="Hidden products can't be found or bought." />
              <Toggle checked={v.is_featured} onChange={(x) => set("is_featured", x)} label="Featured" description="Shown first on the home page rail." />
              <Toggle checked={v.is_new_arrival} onChange={(x) => set("is_new_arrival", x)} label="New arrival" />
              <Toggle checked={v.is_best_seller} onChange={(x) => set("is_best_seller", x)} label="Best seller" />
              <Toggle checked={v.is_luxury} onChange={(x) => set("is_luxury", x)} label="Luxury collection" />
            </div>
          </Card>

          <Card title="Search engines (optional)">
            <div className="grid gap-4 p-5">
              <FieldRow label="Page title" htmlFor="p-seot" hint={`${v.seo_title.length}/70`}><TextInput id="p-seot" value={v.seo_title} maxLength={70} onChange={(e) => set("seo_title", e.target.value)} /></FieldRow>
              <FieldRow label="Description" htmlFor="p-seod" hint={`${v.seo_description.length}/170`}><TextArea id="p-seod" value={v.seo_description} maxLength={170} rows={3} onChange={(e) => set("seo_description", e.target.value)} /></FieldRow>
            </div>
          </Card>

          {v.id && (
            <Card title="Danger zone">
              <div className="space-y-3 p-5 text-sm text-cocoa">
                <p>Deleting removes the product, its sizes and photos. Past orders keep their own copy of the details.</p>
                <AdminButton variant="danger" onClick={() => setConfirmDelete(true)}>Delete product</AdminButton>
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-paper/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-[90rem] items-center justify-end gap-3 px-4 py-3 sm:px-8">
          <AdminButton variant="outline" onClick={() => router.push("/admin/products")}>Back</AdminButton>
          <AdminButton type="submit" disabled={saving || uploading > 0} className={cn(saving && "cursor-wait")}>
            {saving ? "Saving…" : v.id ? "Save changes" : "Create product"}
          </AdminButton>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete “${v.name}”?`}
        destructive
        confirmLabel="Delete permanently"
        pending={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => startDelete(async () => {
          if (toastResult(await deleteProduct(v.id!))) router.replace("/admin/products");
          setConfirmDelete(false);
        })}
      >
        This can&apos;t be undone. To hide it temporarily instead, switch off “Visible in store”.
      </ConfirmDialog>
    </form>
  );
}
