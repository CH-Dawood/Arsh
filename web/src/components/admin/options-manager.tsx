"use client";

import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { deleteOption, reorderSizes, saveColor, saveSize } from "@/lib/admin/actions/options";
import { toastResult } from "@/lib/admin/toast";
import { ConfirmDialog } from "./client";
import { AdminButton, Card, FieldRow, TextInput } from "./ui";

export interface SizeRow { id: string; code: string; label: string; used: number }
export interface ColorRow { id: string; name: string; hex: string | null; used: number }

type SizeDraft = { kind: "size"; id?: string; code: string; label: string };
type ColorDraft = { kind: "color"; id?: string; name: string; hex: string };
type ToDelete = { kind: "size" | "color"; id: string; name: string; used: number };

const usedText = (n: number) => (n ? `Used by ${n} product size${n === 1 ? "" : "s"}` : "Not used yet");

export function OptionsManager({ sizes, colors }: { sizes: SizeRow[]; colors: ColorRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<SizeDraft | ColorDraft | null>(null);
  const [toDelete, setToDelete] = useState<ToDelete | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    start(async () => {
      if (toastResult(await fn())) {
        after?.();
        router.refresh();
      }
    });

  const moveSize = (i: number, dir: -1 | 1) => {
    const ids = sizes.map((s) => s.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    run(() => reorderSizes(ids));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title="Sizes" actions={<AdminButton size="sm" onClick={() => setDraft({ kind: "size", code: "", label: "" })}><Plus className="size-4" aria-hidden /> Add size</AdminButton>}>
        <ul className="divide-y divide-hairline">
          {sizes.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <div className="flex shrink-0">
                <button type="button" disabled={i === 0 || pending} onClick={() => moveSize(i, -1)} className="grid size-8 place-items-center disabled:opacity-30" aria-label={`Move ${s.label} up`}><ArrowUp className="size-4" /></button>
                <button type="button" disabled={i === sizes.length - 1 || pending} onClick={() => moveSize(i, 1)} className="grid size-8 place-items-center disabled:opacity-30" aria-label={`Move ${s.label} down`}><ArrowDown className="size-4" /></button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.label} <span className="font-normal text-cocoa">({s.code})</span></p>
                <p className="text-xs text-cocoa">{usedText(s.used)}</p>
              </div>
              <AdminButton size="sm" variant="ghost" aria-label={`Edit ${s.label}`} onClick={() => setDraft({ kind: "size", id: s.id, code: s.code, label: s.label })}><Pencil className="size-4" /></AdminButton>
              <AdminButton size="sm" variant="ghost" className="text-danger" aria-label={`Delete ${s.label}`} onClick={() => setToDelete({ kind: "size", id: s.id, name: s.label, used: s.used })}><Trash2 className="size-4" /></AdminButton>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Colours" actions={<AdminButton size="sm" onClick={() => setDraft({ kind: "color", name: "", hex: "" })}><Plus className="size-4" aria-hidden /> Add colour</AdminButton>}>
        <ul className="divide-y divide-hairline">
          {colors.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="size-6 shrink-0 rounded-full border border-hairline" style={c.hex ? { background: c.hex } : undefined} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-cocoa">{usedText(c.used)}</p>
              </div>
              <AdminButton size="sm" variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => setDraft({ kind: "color", id: c.id, name: c.name, hex: c.hex ?? "" })}><Pencil className="size-4" /></AdminButton>
              <AdminButton size="sm" variant="ghost" className="text-danger" aria-label={`Delete ${c.name}`} onClick={() => setToDelete({ kind: "color", id: c.id, name: c.name, used: c.used })}><Trash2 className="size-4" /></AdminButton>
            </li>
          ))}
        </ul>
      </Card>

      <Sheet open={draft !== null} onClose={() => setDraft(null)} side="right" label={draft?.kind === "color" ? "Colour" : "Size"}>
        {draft && (
          <form
            className="flex h-full flex-col overflow-y-auto p-6 pt-12"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => (draft.kind === "size" ? saveSize({ id: draft.id, code: draft.code, label: draft.label }) : saveColor({ id: draft.id, name: draft.name, hex: draft.hex })), () => setDraft(null));
            }}
          >
            <h2 className="text-2xl">{draft.id ? "Edit" : "Add"} {draft.kind === "size" ? "size" : "colour"}</h2>
            <div className="mt-6 space-y-4">
              {draft.kind === "size" ? (
                <>
                  <FieldRow label="Code *" htmlFor="o-code" hint={draft.id ? "Fixed once created, because links and SKUs use it." : "Short code, for example XL."}>
                    <TextInput id="o-code" required maxLength={20} disabled={Boolean(draft.id)} data-autofocus={!draft.id || undefined} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} />
                  </FieldRow>
                  <FieldRow label="Name *" htmlFor="o-label" hint="What customers see, for example Extra Large.">
                    <TextInput id="o-label" required maxLength={40} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
                  </FieldRow>
                </>
              ) : (
                <>
                  <FieldRow label="Name *" htmlFor="o-name">
                    <TextInput id="o-name" data-autofocus required maxLength={40} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  </FieldRow>
                  <FieldRow label="Colour code" htmlFor="o-hex" hint="Optional, like #A8864E.">
                    <TextInput id="o-hex" maxLength={7} value={draft.hex} onChange={(e) => setDraft({ ...draft, hex: e.target.value })} />
                  </FieldRow>
                </>
              )}
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
        title={`Delete ${toDelete?.name}?`}
        destructive
        confirmLabel="Delete"
        pending={pending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && run(() => deleteOption(toDelete.kind, toDelete.id), () => setToDelete(null))}
      >
        {toDelete?.used ? "Products still use this, so it can't be deleted until they're changed." : "It will no longer be offered when adding products."}
      </ConfirmDialog>
    </div>
  );
}
