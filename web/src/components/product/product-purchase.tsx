"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { PurchasePanel, type Purchasable } from "./purchase-panel";
import { SizeGuideContent } from "./size-guide";

/** Product-page purchase panel with the size guide drawer attached. */
export function ProductPurchase({ product, sizeGuide }: { product: Purchasable; sizeGuide: string }) {
  const [guideOpen, setGuideOpen] = useState(false);
  const stitched = !(product.sizes.length === 1 && product.sizes[0].code === "UNSTITCHED");
  return (
    <>
      <PurchasePanel product={product} onSizeGuide={stitched ? () => setGuideOpen(true) : undefined} />
      <Sheet open={guideOpen} onClose={() => setGuideOpen(false)} side="right" label="Size guide">
        <div className="overflow-y-auto px-6 pb-10 pt-14">
          <h2 className="text-3xl">Size guide</h2>
          <SizeGuideContent body={sizeGuide} />
        </div>
      </Sheet>
    </>
  );
}
