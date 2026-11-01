"use client";

import { useRouter } from "next/navigation";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { deleteBrand, saveBrand, setBrandActive } from "@/lib/admin/actions/brands";
import { toastResult } from "@/lib/admin/toast";
import { ConfirmDialog, Toggle } from "./client";
import { AdminButton, Card, DataTable, EmptyState, FieldRow, SelectInput, TextArea, TextInput } from "./ui";

export interface BrandRow {
  id: string; name: string; slug: string; description: string | null;
  is_active: boolean; is_featured: boolean; product_count: number;
}

type Draft = { id?: string; name: string; slug: string; description: string; is_active: boolean; is_featured: boolean };
const blank: Draft = { name: "", slug: "", description: "", is_active: true, is_featured: false };
const slugify = (s: string) => s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");

export function BrandsManager({ brands }: { brands: BrandRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<BrandRow | null>(null);
  const [moveTo, setMoveTo] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    start(async () => {
      if (toastResult(await fn())) {
        after?.();
        router.refresh();
      }
    });

  const q = query.trim().toLowerCase();
  const shown = q ? brands.filter((b) => b.name.toLowerCase().includes(q) || b.slug.includes(q)) : brands;
  const closeDelete = () => { setToDelete(null); setMoveTo(""); };

  return (
    <>
      <Card actions={<AdminButton size="sm" onClick={() => setDraft({ ...blank })}><Plus className="size-4" aria-hidden /> Add brand</AdminButton>} title={`${brands.length} brands & labels`}>
        {brands.length > 0 && (
          <div className="border-b border-hairline p-4" role="search">
            <label htmlFor="b-search" className="sr-only">Search brands and labels</label>
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cocoa" aria-hidden />
              <TextInput id="b-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search brands and labels" className="pl-9" />
            </div>
          </div>
        )}
        {brands.length === 0 ? (
          <EmptyState title="No brands yet">Add brands or labels, then choose them on each product.</EmptyState>
        ) : shown.length === 0 ? (
          <EmptyState title="No matches">Nothing matches “{query}”.</EmptyState>
        ) : (
          <DataTable>
            <thead><tr><th>Brand / label</th><th className="text-right">Products</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {shown.map((b) => (
                <tr key={b.id}>
                  <td>
                    <span className="font-medium">{b.name}</span>
                    <span className="block text-xs text-cocoa">/brands/{b.slug}</span>
                  </td>
                  <td className="text-right tabular-nums">{b.product_count}</td>
                  <td className="text-xs">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={b.is_active} disabled={pending} onChange={(e) => run(() => setBrandActive(b.id, e.target.checked))} className="size-4 accent-espresso" aria-label={`${b.name} enabled`} />
                      {b.is_active ? "Enabled" : <span className="text-cocoa">Disabled</span>}
                    </label>
                    {b.is_featured && <span className="block text-cocoa">Featured</span>}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <AdminButton size="sm" variant="ghost" onClick={() => setDraft({ id: b.id, name: b.name, slug: b.slug, description: b.description ?? "", is_active: b.is_active, is_featured: b.is_featured })} aria-label={`Edit ${b.name}`}><Pencil className="size-4" /></AdminButton>
                      <AdminButton size="sm" variant="ghost" className="text-danger" onClick={() => setToDelete(b)} aria-label={`Delete ${b.name}`}><Trash2 className="size-4" /></AdminButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>

      <Sheet open={draft !== null} onClose={() => setDraft(null)} side="right" label={draft?.id ? "Edit brand" : "Add brand"}>
        {draft && (
          <form
            className="flex h-full flex-col overflow-y-auto p-6 pt-12"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => saveBrand(draft), () => setDraft(null));
            }}
          >
            <h2 className="text-2xl">{draft.id ? "Edit brand" : "Add brand"}</h2>
            <div className="mt-6 space-y-4">
              <FieldRow label="Name *" htmlFor="b-name" hint={draft.id ? "Renaming updates every product that uses it." : undefined}>
                <TextInput id="b-name" data-autofocus required maxLength={80} value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: draft.id ? draft.slug : slugify(e.target.value) })} />
              </FieldRow>
              <FieldRow label="URL name *" htmlFor="b-slug" hint={`Brand page: /brands/${draft.slug || "…"}`}>
                <TextInput id="b-slug" required value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })} />
              </FieldRow>
              <FieldRow label="Description" htmlFor="b-desc">
                <TextArea id="b-desc" maxLength={1000} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </FieldRow>
              <Toggle checked={draft.is_active} onChange={(x) => setDraft({ ...draft, is_active: x })} label="Enabled" description="Disabled brands are hidden in the store; products keep the brand and can still be sold." />
              <Toggle checked={draft.is_featured} onChange={(x) => setDraft({ ...draft, is_featured: x })} label="Featured" description="Its products appear in the “Our labels” collection." />
            </div>
            <div className="mt-auto flex justify-end gap-2 pt-8">
              <AdminButton variant="outline" onClick={() => setDraft(null)}>Cancel</AdminButton>
              <AdminButton type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</AdminButton>
            </div>
          </form>
        )}
      </Sheet>

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete “${toDelete?.name}”?`}
        destructive
        confirmLabel="Delete brand"
        pending={pending}
        onCancel={closeDelete}
        onConfirm={() => {
          if (!toDelete) return;
          if (toDelete.product_count && !moveTo) return toastResult({ ok: false, message: "Choose what happens to its products first." });
          run(() => deleteBrand(toDelete.id, moveTo === "__clear" ? { clear: true } : { moveTo: moveTo || undefined }), closeDelete);
        }}
      >
        {toDelete?.product_count ? (
          <div className="space-y-3">
            <p>{toDelete.product_count} product{toDelete.product_count === 1 ? " uses" : "s use"} this brand. Choose a brand for them, or remove the label. Orders are not affected.</p>
            <FieldRow label="Products will *" htmlFor="b-move">
              <SelectInput id="b-move" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                <option value="">Choose…</option>
                <option value="__clear">Have no brand / label</option>
                {brands.filter((b) => b.id !== toDelete.id).map((b) => <option key={b.id} value={b.id}>Move to {b.name}{b.is_active ? "" : " (disabled)"}</option>)}
              </SelectInput>
            </FieldRow>
          </div>
        ) : "No products use it. Tip: to hide a brand without deleting it, disable it instead."}
      </ConfirmDialog>
    </>
  );
}
