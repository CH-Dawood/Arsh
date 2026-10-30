import { cn, discountPercent, formatPKR } from "@/lib/format";

export function Price({ price, compareAtPrice, className, showSaving = false }: {
  price: number;
  compareAtPrice: number | null;
  className?: string;
  showSaving?: boolean;
}) {
  const off = discountPercent(price, compareAtPrice);
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2.5 gap-y-1", className)}>
      <span className={cn(off > 0 && "text-danger")}>
        <span className="sr-only">{off > 0 ? "Sale price " : "Price "}</span>
        {formatPKR(price)}
      </span>
      {off > 0 && (
        <>
          <s className="text-[0.9em] text-cocoa">
            <span className="sr-only">Original price </span>
            {formatPKR(compareAtPrice!)}
          </s>
          {showSaving && <span className="label text-danger">Save {off}%</span>}
        </>
      )}
    </p>
  );
}
