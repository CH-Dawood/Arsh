import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { PageHeader } from "@/components/listing/page-header";
import { getSettings } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Checkout", description: "Complete your order.", path: "/checkout", noIndex: true });

export default async function CheckoutPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Checkout" crumbs={[{ name: "Shopping Bag", href: "/cart" }, { name: "Checkout", href: "/checkout" }]} />
      <div className="container-page">
        <CheckoutForm
          settings={{
            freeShippingThreshold: s.freeShippingThreshold,
            shippingFee: s.shippingFee,
            codEnabled: s.codEnabled,
            bankTransferEnabled: s.bankTransferEnabled,
          }}
        />
      </div>
    </>
  );
}
