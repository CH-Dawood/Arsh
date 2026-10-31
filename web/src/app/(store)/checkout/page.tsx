import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { PageHeader } from "@/components/listing/page-header";
import { ButtonLink } from "@/components/ui/button";
import { getSettings } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Checkout", description: "Complete your order.", path: "/checkout", noIndex: true });

export default async function CheckoutPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Checkout" crumbs={[{ name: "Shopping Bag", href: "/cart" }, { name: "Checkout", href: "/checkout" }]} />
      <div className="container-page">
        {/* Only an explicit "closed" pauses checkout, so a settings entry cached before the flag existed can't block orders. */}
        {s.storeOpen === false ? (
          <div className="py-20 text-center">
            <p className="font-display text-3xl">Orders are paused</p>
            <p className="mx-auto mt-3 max-w-md text-cocoa">{s.closedMessage || "We're not taking orders right now. Your bag is saved, so please check back soon."}</p>
            <ButtonLink href="/shop" variant="outline" className="mt-8">Keep browsing</ButtonLink>
          </div>
        ) : (
        <CheckoutForm
          settings={{
            freeShippingThreshold: s.freeShippingThreshold,
            shippingFee: s.shippingFee,
            codEnabled: s.codEnabled,
            bankTransferEnabled: s.bankTransferEnabled,
          }}
        />
        )}
      </div>
    </>
  );
}
