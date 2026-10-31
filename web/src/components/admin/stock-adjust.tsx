"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { adjustStock } from "@/lib/admin/actions/inventory";
import { toastResult } from "@/lib/admin/toast";
import { AdminButton, FieldRow, SelectInput, TextInput } from "./ui";

export function StockAdjustButton({ variantId, label, stock }: { variantId: string; label: string; stock: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "set">("add");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const qty = Number.parseInt(quantity, 10);
  const preview = Number.isFinite(qty) ? (mode === "set" ? qty : stock + qty) : stock;

  return (
    <>
      <AdminButton size="sm" variant="outline" onClick={() => setOpen(true)}>Adjust</AdminButton>
      <Sheet open={open} onClose={() => setOpen(false)} side="center" label={`Adjust stock: ${label}`} className="w-[min(94vw,26rem)]">
        <form
          className="space-y-4 p-6 pt-8"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              if (toastResult(await adjustStock({ variantId, mode, quantity: qty, note }))) {
                setOpen(false);
                setQuantity("");
                setNote("");
                router.refresh();
              }
            });
          }}
        >
          <h2 className="text-2xl">Adjust stock</h2>
          <p className="text-sm text-cocoa">{label} · currently <strong className="text-espresso">{stock}</strong></p>
          <FieldRow label="Change" htmlFor="adj-mode">
            <SelectInput id="adj-mode" value={mode} onChange={(e) => setMode(e.target.value as "add" | "set")}>
              <option value="add">Add or remove pieces</option>
              <option value="set">Set exact count</option>
            </SelectInput>
          </FieldRow>
          <FieldRow label={mode === "add" ? "Quantity (use − to remove)" : "New stock count"} htmlFor="adj-qty" hint={`Stock after saving: ${preview < 0 ? "not allowed" : preview}`}>
            <TextInput id="adj-qty" data-autofocus type="number" required value={quantity} onChange={(e) => setQuantity(e.target.value)} min={mode === "set" ? 0 : undefined} />
          </FieldRow>
          <FieldRow label="Reason (optional)" htmlFor="adj-note" hint="Saved in the inventory history.">
            <TextInput id="adj-note" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="New delivery, stock count, damaged…" />
          </FieldRow>
          <div className="flex justify-end gap-2 pt-2">
            <AdminButton variant="outline" onClick={() => setOpen(false)}>Cancel</AdminButton>
            <AdminButton type="submit" disabled={pending || !Number.isFinite(qty) || preview < 0}>{pending ? "Saving…" : "Save"}</AdminButton>
          </div>
        </form>
      </Sheet>
    </>
  );
}
