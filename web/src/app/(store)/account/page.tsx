import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/listing/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { formatPKR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My Account", robots: { index: false, follow: false } };

export default function AccountPage() {
  return (
    <>
      <PageHeader title="My Account" crumbs={[{ name: "My Account", href: "/account" }]} />
      <div className="container-page max-w-4xl">
        {isSupabaseConfigured ? (
          <Suspense fallback={<div className="h-64 animate-pulse bg-linen" />}><Account /></Suspense>
        ) : (
          <div className="py-12 text-center">
            <p className="font-display text-3xl">Accounts open when the store goes live</p>
            <p className="mt-3 text-cocoa">You can still browse, save pieces to your wishlist and fill your bag.</p>
            <ButtonLink href="/shop" className="mt-8">Continue shopping</ButtonLink>
          </div>
        )}
      </div>
    </>
  );
}

const statusLabel: Record<string, string> = {
  pending: "Placed", confirmed: "Confirmed", processing: "Processing", shipped: "Shipped",
  delivered: "Delivered", cancelled: "Cancelled", returned: "Returned",
};

async function Account() {
  const user = await requireUser("/account");
  const supabase = await createClient();
  // RLS limits both queries to this customer's own rows.
  const [{ data: profile }, { data: orders }, { data: isAdmin }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).single(),
    supabase.from("orders").select("order_number, created_at, status, total").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    supabase.rpc("is_admin"),
  ]);

  return (
    <div className="grid gap-12 md:grid-cols-[16rem_1fr]">
      <aside className="space-y-2">
        <p className="font-display text-2xl">{profile?.full_name ?? "Welcome"}</p>
        <p className="text-sm text-cocoa">{user.email}</p>
        {profile?.phone && <p className="text-sm text-cocoa">{profile.phone}</p>}
        <div className="flex flex-col items-start gap-3 pt-6">
          {isAdmin && <Link href="/admin" className="label text-gold-deep hover:text-espresso">Admin dashboard</Link>}
          <Link href="/wishlist" className="label hover:text-gold-deep">Wishlist</Link>
          <Link href="/track-order" className="label hover:text-gold-deep">Track an order</Link>
          <form action={logout}><Button type="submit" variant="ghost" className="text-danger">Sign out</Button></form>
        </div>
      </aside>
      <section aria-labelledby="orders-heading">
        <h2 id="orders-heading" className="text-3xl">Your orders</h2>
        {orders?.length ? (
          <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
            {orders.map((o: { order_number: string; created_at: string; status: string; total: number }) => (
              <li key={o.order_number} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
                <span className="font-medium">{o.order_number}</span>
                <span className="text-cocoa">{new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeZone: "Asia/Karachi" }).format(new Date(o.created_at))}</span>
                <span className="label">{statusLabel[o.status] ?? o.status}</span>
                <span>{formatPKR(o.total)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-cocoa">No orders yet. <Link href="/shop" className="underline underline-offset-4">Start shopping</Link>.</p>
        )}
      </section>
    </div>
  );
}
