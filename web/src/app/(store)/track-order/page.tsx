import type { Metadata } from "next";
import { PageHeader } from "@/components/listing/page-header";
import { TrackOrderForm } from "@/components/orders/track-order-form";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Track Your Order", description: "Check the status of your order with your order number and phone number.", path: "/track-order" });

export default function TrackOrderPage() {
  return (
    <>
      <PageHeader title="Track Your Order" description="Enter the order number from your confirmation and the phone number you used at checkout." crumbs={[{ name: "Order Tracking", href: "/track-order" }]} />
      <div className="container-page max-w-3xl">
        <TrackOrderForm />
      </div>
    </>
  );
}
