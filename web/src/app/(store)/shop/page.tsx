import type { Metadata } from "next";
import { PageHeader } from "@/components/listing/page-header";
import { ProductListing } from "@/components/listing/product-listing";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Shop All",
  description: "Browse every piece: luxury formals, embroidered and printed suits, kurta shalwar and ready-to-wear.",
  path: "/shop",
});

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <>
      <PageHeader title="Shop All" eyebrow="The collection" description="Every piece, from everyday prêt to bridal couture." crumbs={[{ name: "Shop All", href: "/shop" }]} />
      <div className="container-page">
        <ProductListing basePath="/shop" searchParams={searchParams} categoryFilter />
      </div>
    </>
  );
}
