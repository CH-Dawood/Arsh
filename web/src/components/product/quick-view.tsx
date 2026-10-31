"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Price } from "@/components/ui/price";
import type { ProductSummary } from "@/lib/catalog/types";
import { PurchasePanel } from "./purchase-panel";

export function QuickView({ product, open, onClose }: { product: ProductSummary; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} side="center" label={`Quick view: ${product.name}`}>
      <div className="grid overflow-y-auto md:grid-cols-2">
        <div className="flex snap-x snap-mandatory overflow-x-auto bg-champagne md:block md:overflow-visible">
          {product.images.map((img, i) => (
            <div key={img.url} className="relative aspect-[3/4] w-full shrink-0 snap-center md:[&:not(:first-child)]:hidden">
              <Image src={img.url} alt={img.alt} fill sizes="(min-width: 768px) 30rem, 94vw" className="object-cover" loading={i === 0 ? "eager" : "lazy"} />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-6 p-6 sm:p-10">
          <div>
            {product.brand && <p className="label text-gold-deep">{product.brand.name}</p>}
            <h2 className="mt-2 text-3xl leading-tight">{product.name}</h2>
            <Price price={product.price} compareAtPrice={product.compareAtPrice} showSaving className="mt-3 text-lg" />
          </div>
          <PurchasePanel
            product={{ ...product, image: product.images[0]?.url ?? "" }}
            onDone={onClose}
          />
          <Link href={`/products/${product.slug}`} onClick={onClose} className="label group mt-auto flex items-center gap-2 pt-2">
            View full details
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </div>
    </Sheet>
  );
}
