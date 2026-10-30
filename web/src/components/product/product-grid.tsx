import type { ProductSummary } from "@/lib/catalog/types";
import { cn } from "@/lib/format";
import { ProductCard } from "./product-card";

export function ProductGrid({ products, className, priorityCount = 0 }: { products: ProductSummary[]; className?: string; priorityCount?: number }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4 xl:gap-y-14", className)}>
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="animate-pulse">
          <div className="aspect-[3/4] bg-champagne" />
          <div className="mt-4 h-3 w-1/3 bg-champagne" />
          <div className="mt-3 h-5 w-3/4 bg-champagne" />
          <div className="mt-3 h-4 w-1/4 bg-champagne" />
        </li>
      ))}
    </ul>
  );
}
