"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/format";

export function QuantityStepper({ value, max, onChange, label, size = "md" }: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const btn = cn("grid place-items-center transition-colors hover:bg-linen disabled:opacity-30", size === "sm" ? "size-8" : "size-11");
  return (
    <div className="inline-flex items-center border border-hairline" role="group" aria-label={`Quantity for ${label}`}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity">
        <Minus className="size-3.5" strokeWidth={1.5} />
      </button>
      <output className={cn("text-center text-sm tabular-nums", size === "sm" ? "w-7" : "w-10")} aria-live="polite">{value}</output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="size-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
