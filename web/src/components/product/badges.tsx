import type { Badge } from "@/lib/catalog/types";
import { cn, discountPercent } from "@/lib/format";

const labels: Record<Exclude<Badge, "sale">, string> = { new: "New", bestseller: "Best Seller", luxury: "Luxury" };

export function ProductBadges({ badges, price, compareAtPrice, soldOut, className }: {
  badges: Badge[];
  price: number;
  compareAtPrice: number | null;
  soldOut?: boolean;
  className?: string;
}) {
  const off = discountPercent(price, compareAtPrice);
  const items = soldOut
    ? [{ key: "out", text: "Sold out", tone: "bg-cocoa text-ivory" }]
    : [
        ...(off > 0 ? [{ key: "sale", text: `-${off}%`, tone: "bg-danger text-ivory" }] : []),
        ...badges
          .filter((b): b is Exclude<Badge, "sale"> => b !== "sale")
          .slice(0, 2)
          .map((b) => ({ key: b, text: labels[b], tone: b === "luxury" ? "bg-espresso text-champagne" : "bg-ivory/90 text-espresso" })),
      ];
  if (!items.length) return null;
  return (
    <ul className={cn("flex flex-col items-start gap-1.5", className)}>
      {items.map((b) => (
        <li key={b.key} className={cn("label px-2.5 py-1.5 text-[0.625rem] backdrop-blur-sm", b.tone)}>{b.text}</li>
      ))}
    </ul>
  );
}
