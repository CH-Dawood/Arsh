"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { deleteCategory, moveCategory, saveCategory } from "@/lib/admin/actions/categories";
import { uploadCatalogImage } from "@/lib/admin/actions/products";
import { toastResult } from "@/lib/admin/toast";
import { ConfirmDialog, Toggle } from "./client";
import { AdminButton, Card, DataTable, EmptyState, FieldRow, TextArea, TextInput } from "./ui";

export interface CategoryRow {
  id: string; name: string; slug: string; description: string | null; image_path: string | null; image_url: string | null;
  is_active: boolean; product_count: number;
}

type Draft = { id?: string; name: string; slug: string; description: string; image_path: string; image_url: string; is_active: boolean };
const blank: Draft = { name: "", slug: "", description: "", image_path: "", image_url: "", is_active: true };
const slugify = (s: string) => s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");

export function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<CategoryRow | null>(null);
  const [uploading, setUploading] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    start(async () => {
      if (toastResult(await fn())) {
        after?.();
        router.refresh();
      }
    });

  const upload = async (file: File | undefined) => {
    if (!file || !draft) return;
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", "categories");
    const res = await uploadCatalogImage(fd);
    setUploading(false);
    if (toastResult(res) && res.ok && res.data) setDraft({ ...draft, image_path: res.data.path, image_url: res.data.url });
  };

  return (
    <>
      <Card actions={<AdminButton size="sm" onClick={() => setDraft({ ...blank })}><Plus className="size-4" aria-hidden /> Add category</AdminButton>} title={`${categories.length} categories`}>
        {categories.length === 0 ? (
          <EmptyState title="No categories yet">Add categories to organise your products.</EmptyState>
        ) : (
          <DataTable>
            <thead><tr><th>Order</th><th>Category</th><th className="text-right">Products</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {categories.map((c, i) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex">
                      <button type="button" disabled={i === 0 || pending} onClick={() => run(() => moveCategory(c.id, "up"))} className="grid size-8 place-items-center disabled:opacity-30" aria-label={`Move ${c.name} up`}><ArrowUp className="size-4" /></button>
                      <button type="button" disabled={i === categories.length - 1 || pending} onClick={() => run(() => moveCategory(c.id, "down"))} className="grid size-8 place-items-center disabled:opacity-30" aria-label={`Move ${c.name} down`}><ArrowDown className="size-4" /></button>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="relative size-12 shrink-0 overflow-hidden bg-champagne">
                        {c.image_url && <Image src={c.image_url} alt="" fill sizes="48px" className="object-cover" />}
                      </span>
                      <span><span className="font-medium">{c.name}</span><span className="block text-xs text-cocoa">/{c.slug}</span></span>
                    </div>
                  </td>
                  <td className="text-right tabular-nums">{c.product_count}</td>
                  <td className="text-xs">{c.is_active ? "Shown" : <span className="text-cocoa">Hidden</span>}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <AdminButton size="sm" variant="ghost" onClick={() => setDraft({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", image_path: c.image_path ?? "", image_url: c.image_url ?? "", is_active: c.is_active })} aria-label={`Edit ${c.name}`}><Pencil className="size-4" /></AdminButton>
                      <AdminButton size="sm" variant="ghost" className="text-danger" onClick={() => setToDelete(c)} aria-label={`Delete ${c.name}`}><Trash2 className="size-4" /></AdminButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>

      <Sheet open={draft !== null} onClose={() => setDraft(null)} side="right" label={draft?.id ? "Edit category" : "Add category"}>
        {draft && (
          <form
            className="flex h-full flex-col overflow-y-auto p-6 pt-12"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => saveCategory({ id: draft.id, name: draft.name, slug: draft.slug, description: draft.description, image_path: draft.image_path, is_active: draft.is_active }), () => setDraft(null));
            }}
          >
            <h2 className="text-2xl">{draft.id ? "Edit category" : "Add category"}</h2>
            <div className="mt-6 space-y-4">
              <FieldRow label="Name *" htmlFor="c-name">
                <TextInput id="c-name" data-autofocus required maxLength={80} value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: draft.id ? draft.slug : slugify(e.target.value) })} />
              </FieldRow>
              <FieldRow label="URL name *" htmlFor="c-slug" hint={`Used in /shop?category=${draft.slug || "…"}`}>
                <TextInput id="c-slug" required value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })} />
              </FieldRow>
              <FieldRow label="Description" htmlFor="c-desc">
                <TextArea id="c-desc" maxLength={1000} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </FieldRow>
              <div>
                <p className="mb-1.5 text-xs font-medium text-cocoa">Image</p>
                <div className="flex items-center gap-4">
                  <span className="relative h-24 w-20 shrink-0 overflow-hidden bg-champagne">
                    {draft.image_url && <Image src={draft.image_url} alt="" fill sizes="80px" className="object-cover" />}
                  </span>
                  <div className="space-y-2">
                    <label className="inline-flex h-9 cursor-pointer items-center gap-2 border border-hairline px-3 text-sm hover:border-espresso">
                      <ImagePlus className="size-4" aria-hidden /> {uploading ? "Uploading…" : draft.image_url ? "Replace" : "Upload"}
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
                    </label>
                    {draft.image_url && <button type="button" onClick={() => setDraft({ ...draft, image_path: "", image_url: "" })} className="block text-xs text-danger underline">Remove image</button>}
                  </div>
                </div>
              </div>
              <Toggle checked={draft.is_active} onChange={(x) => setDraft({ ...draft, is_active: x })} label="Show in store" description="Hidden categories disappear from menus and filters." />
            </div>
            <div className="mt-auto flex justify-end gap-2 pt-8">
              <AdminButton variant="outline" onClick={() => setDraft(null)}>Cancel</AdminButton>
              <AdminButton type="submit" disabled={pending || uploading}>{pending ? "Saving…" : "Save"}</AdminButton>
            </div>
          </form>
        )}
      </Sheet>

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete “${toDelete?.name}”?`}
        destructive
        confirmLabel="Delete category"
        pending={pending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && run(() => deleteCategory(toDelete.id), () => setToDelete(null))}
      >
        {toDelete?.product_count
          ? `It still has ${toDelete.product_count} product(s); move them to another category first.`
          : "If this category is used as a home page tile, that tile is removed too."}
      </ConfirmDialog>
    </>
  );
}
