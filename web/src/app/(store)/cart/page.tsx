import type { Metadata } from "next";
import { PageHeader } from "@/components/listing/page-header";
import { CartView } from "@/components/cart/cart-view";
import { getSettings } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Shopping Bag", description: "Review the pieces in your bag.", path: "/cart", noIndex: true });

export default async function CartPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Shopping Bag" crumbs={[{ name: "Shopping Bag", href: "/cart" }]} />
      <div className="container-page">
        <CartView freeShippingThreshold={settings.freeShippingThreshold} shippingFee={settings.shippingFee} />
      </div>
    </>
  );
}
