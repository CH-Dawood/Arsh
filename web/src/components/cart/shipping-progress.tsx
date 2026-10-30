import { Truck } from "lucide-react";
import { formatPKR } from "@/lib/format";

export function ShippingProgress({ subtotal, threshold }: { subtotal: number; threshold: number }) {
  const remaining = Math.max(0, threshold - subtotal);
  const pct = threshold > 0 ? Math.min(100, (subtotal / threshold) * 100) : 100;
  return (
    <div>
      <p className="flex items-center gap-2 text-sm">
        <Truck className="size-4 shrink-0 text-gold-deep" strokeWidth={1.5} aria-hidden />
        {remaining > 0 ? <>Add <strong className="font-medium">{formatPKR(remaining)}</strong> more for free shipping</> : "You’ve unlocked free nationwide shipping"}
      </p>
      <div className="mt-3 h-0.5 bg-hairline" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Progress to free shipping">
        <div className="h-full origin-left bg-gold transition-transform duration-700 ease-luxe" style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
    </div>
  );
}
