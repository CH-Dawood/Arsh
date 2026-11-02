"use client";

import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { deleteCoupon, saveCoupon, setCouponActive, type CouponInput } from "@/lib/admin/actions/coupons";
import { toastResult } from "@/lib/admin/toast";
import { formatPKR } from "@/lib/format";
import { ConfirmDialog, Toggle } from "./client";
import { AdminButton, Card, DataTable, EmptyState, FieldRow, SelectInput, TextInput, formatDateTime } from "./ui";

export interface CouponRow {
  id: string; code: string; description: string | null; discount_type: "percent" | "fixed"; value: number;
  max_discount: number | null; min_order_amount: number; starts_at: string | null; expires_at: string | null;
  usage_limit: number | null; per_customer_limit: number | null; times_used: number; is_active: boolean;
}

type Draft = {
  id?: string; code: string; description: string; discount_type: "percent" | "fixed"; value: string; max_discount: string;
  min_order_amount: string; starts_at: string; expires_at: string; usage_limit: string; per_customer_limit: string; is_active: boolean;
};
const blank: Draft = { code: "", description: "", discount_type: "percent", value: "", max_discount: "", min_order_amount: "0", starts_at: "", expires_at: "", usage_limit: "", per_customer_limit: "", is_active: true };
const text = (v: number | null) => (v === null ? "" : String(v));

// <input type="datetime-local"> works in the browser's time zone; the server stores exact times.
const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const toIso = (local: string) => (local ? new Date(local).toISOString() : "");

const discountText = (c: CouponRow) =>
  c.discount_type === "percent" ? `${c.value}% off${c.max_discount ? `, up to ${formatPKR(c.max_discount)}` : ""}` : `${formatPKR(c.value)} off`;

export function CouponsManager({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<CouponRow | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    start(async () => {
      if (toastResult(await fn())) {
        after?.();
        router.refresh();
      }
    });
  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <>
      <Card title={`${coupons.length} coupon${coupons.length === 1 ? "" : "s"}`} actions={<AdminButton size="sm" onClick={() => setDraft({ ...blank })}><Plus className="size-4" aria-hidden /> Add coupon</AdminButton>}>
        {coupons.length === 0 ? (
          <EmptyState title="No coupons yet">Add a code customers can use at checkout, such as a percentage or fixed amount off.</EmptyState>
        ) : (
          <DataTable>
            <thead><tr><th>Code</th><th>Discount</th><th>Limits</th><th className="text-right">Used</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="font-medium">{c.code}</span>
                    {c.description && <span className="block text-xs text-cocoa">{c.description}</span>}
                  </td>
                  <td>{discountText(c)}</td>
                  <td className="text-xs text-cocoa">
                    {c.min_order_amount > 0 && <span className="block">Orders from {formatPKR(c.min_order_amount)}</span>}
                    {c.starts_at && <span className="block">From {formatDateTime(c.starts_at)}</span>}
                    {c.expires_at && <span className="block">Until {formatDateTime(c.expires_at)}</span>}
                    {c.per_customer_limit && <span className="block">{c.per_customer_limit} per customer</span>}
                  </td>
                  <td className="text-right tabular-nums">{c.times_used}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                  <td className="text-xs">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={c.is_active} disabled={pending} onChange={(e) => run(() => setCouponActive(c.id, e.target.checked))} className="size-4 accent-espresso" aria-label={`${c.code} active`} />
                      {c.is_active ? "Active" : <span className="text-cocoa">Off</span>}
                    </label>
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <AdminButton size="sm" variant="ghost" aria-label={`Edit ${c.code}`} onClick={() => setDraft({
                        id: c.id, code: c.code, description: c.description ?? "", discount_type: c.discount_type, value: String(c.value), max_discount: text(c.max_discount),
                        min_order_amount: String(c.min_order_amount), starts_at: toLocal(c.starts_at), expires_at: toLocal(c.expires_at),
                        usage_limit: text(c.usage_limit), per_customer_limit: text(c.per_customer_limit), is_active: c.is_active,
                      })}><Pencil className="size-4" /></AdminButton>
                      <AdminButton size="sm" variant="ghost" className="text-danger" aria-label={`Delete ${c.code}`} onClick={() => setToDelete(c)}><Trash2 className="size-4" /></AdminButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>

      <Sheet open={draft !== null} onClose={() => setDraft(null)} side="right" label={draft?.id ? "Edit coupon" : "Add coupon"}>
        {draft && (
          <form
            className="flex h-full flex-col overflow-y-auto p-6 pt-12"
            onSubmit={(e) => {
              e.preventDefault();
              const input: CouponInput = { ...draft, starts_at: toIso(draft.starts_at), expires_at: toIso(draft.expires_at) };
              run(() => saveCoupon(input), () => setDraft(null));
            }}
          >
            <h2 className="text-2xl">{draft.id ? "Edit coupon" : "Add coupon"}</h2>
            <div className="mt-6 space-y-4">
              <FieldRow label="Code *" htmlFor="cp-code" hint="What customers type. Letters, numbers, dashes or underscores.">
                <TextInput id="cp-code" data-autofocus required maxLength={30} value={draft.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} />
              </FieldRow>
              <FieldRow label="Note (only you see this)" htmlFor="cp-desc">
                <TextInput id="cp-desc" maxLength={200} value={draft.description} onChange={(e) => set({ description: e.target.value })} />
              </FieldRow>
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldRow label="Type *" htmlFor="cp-type">
                  <SelectInput id="cp-type" value={draft.discount_type} onChange={(e) => set({ discount_type: e.target.value as Draft["discount_type"] })}>
                    <option value="percent">Percentage off</option>
                    <option value="fixed">Fixed amount off (PKR)</option>
                  </SelectInput>
                </FieldRow>
                <FieldRow label={draft.discount_type === "percent" ? "Percent off *" : "PKR off *"} htmlFor="cp-value">
                  <TextInput id="cp-value" type="number" required min={1} max={draft.discount_type === "percent" ? 100 : undefined} value={draft.value} onChange={(e) => set({ value: e.target.value })} />
                </FieldRow>
                {draft.discount_type === "percent" && (
                  <FieldRow label="Maximum discount (PKR)" htmlFor="cp-max" hint="Optional cap.">
                    <TextInput id="cp-max" type="number" min={1} value={draft.max_discount} onChange={(e) => set({ max_discount: e.target.value })} />
                  </FieldRow>
                )}
                <FieldRow label="Minimum order (PKR)" htmlFor="cp-min">
                  <TextInput id="cp-min" type="number" required min={0} value={draft.min_order_amount} onChange={(e) => set({ min_order_amount: e.target.value })} />
                </FieldRow>
                <FieldRow label="Starts" htmlFor="cp-start">
                  <TextInput id="cp-start" type="datetime-local" value={draft.starts_at} onChange={(e) => set({ starts_at: e.target.value })} />
                </FieldRow>
                <FieldRow label="Ends" htmlFor="cp-end">
                  <TextInput id="cp-end" type="datetime-local" value={draft.expires_at} onChange={(e) => set({ expires_at: e.target.value })} />
                </FieldRow>
                <FieldRow label="Total uses" htmlFor="cp-limit" hint="Empty means no limit.">
                  <TextInput id="cp-limit" type="number" min={1} value={draft.usage_limit} onChange={(e) => set({ usage_limit: e.target.value })} />
                </FieldRow>
                <FieldRow label="Uses per customer" htmlFor="cp-per" hint="Empty means no limit.">
                  <TextInput id="cp-per" type="number" min={1} value={draft.per_customer_limit} onChange={(e) => set({ per_customer_limit: e.target.value })} />
                </FieldRow>
              </div>
              <Toggle checked={draft.is_active} onChange={(x) => set({ is_active: x })} label="Active" description="When off, customers can't use this code." />
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
        title={`Delete ${toDelete?.code}?`}
        destructive
        confirmLabel="Delete coupon"
        pending={pending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && run(() => deleteCoupon(toDelete.id), () => setToDelete(null))}
      >
        Customers won&apos;t be able to use it. A coupon that has been used on orders can&apos;t be deleted; switch it off instead.
      </ConfirmDialog>
    </>
  );
}
