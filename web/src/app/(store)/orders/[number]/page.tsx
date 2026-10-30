import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { CircleCheck } from "lucide-react";
import { ClearCart } from "@/components/orders/clear-cart";
import { OrderStatus } from "@/components/orders/order-status";
import { ButtonLink } from "@/components/ui/button";
import { lookupOrder } from "@/lib/actions/orders";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false, follow: false } };

export default function OrderConfirmationPage({ params }: PageProps<"/orders/[number]">) {
  return (
    <div className="container-page max-w-3xl pt-14">
      <Suspense fallback={<div className="h-96 animate-pulse bg-linen" />}>
        <Confirmation params={params} />
      </Suspense>
    </div>
  );
}

async function Confirmation({ params }: Pick<PageProps<"/orders/[number]">, "params">) {
  const { number } = await params;
  const saved = (await cookies()).get("last_order")?.value;
  let ref: { n?: string; p?: string } = {};
  try { ref = saved ? JSON.parse(saved) : {}; } catch {}

  const order = isSupabaseConfigured && ref.n === number && ref.p ? await lookupOrder(number, ref.p) : null;

  if (!order) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-heading">Find your order</h1>
        <p className="mx-auto mt-4 max-w-md text-cocoa">For your privacy, enter your order number and phone number on the tracking page to see this order.</p>
        <ButtonLink href="/track-order" className="mt-8">Track an order</ButtonLink>
      </div>
    );
  }

  return (
    <>
      <ClearCart />
      <div className="mb-12 text-center">
        <CircleCheck className="mx-auto size-12 text-success" strokeWidth={1.25} aria-hidden />
        <h1 className="mt-4 text-heading">Thank you for your order</h1>
        <p className="mt-3 text-cocoa">We&apos;ve received your order and will confirm it shortly. Keep your order number to track delivery.</p>
      </div>
      <OrderStatus order={order} />
      <div className="mt-12 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/shop" variant="outline">Continue shopping</ButtonLink>
        <ButtonLink href="/track-order" variant="ghost">Track an order</ButtonLink>
      </div>
    </>
  );
}
