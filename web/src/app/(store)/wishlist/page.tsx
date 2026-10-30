import type { Metadata } from "next";
import { PageHeader } from "@/components/listing/page-header";
import { WishlistView } from "@/components/product/wishlist-view";
import { getProducts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Wishlist", description: "Pieces you've saved for later.", path: "/wishlist", noIndex: true });

export default async function WishlistPage() {
  // Saved slugs live in the browser; the view picks them out of the (cached) catalogue.
  const { items } = await getProducts({ pageSize: 500 });
  return (
    <>
      <PageHeader title="Wishlist" crumbs={[{ name: "Wishlist", href: "/wishlist" }]} />
      <div className="container-page">
        <WishlistView products={items} />
      </div>
    </>
  );
}
