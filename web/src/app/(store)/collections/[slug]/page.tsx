import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/listing/page-header";
import { ProductListing } from "@/components/listing/product-listing";
import { ProductGridSkeleton } from "@/components/product/product-grid";
import { getBrands, getCollection, getCollections } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export async function generateStaticParams() {
  return (await getCollections()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const collection = await getCollection((await params).slug);
  if (!collection) notFound();
  return pageMetadata({ title: collection.title, description: collection.description, path: `/collections/${collection.slug}`, image: collection.image ?? undefined });
}

export default function CollectionPage({ params, searchParams }: PageProps<"/collections/[slug]">) {
  return (
    <Suspense fallback={<div className="container-page pt-40"><ProductGridSkeleton /></div>}>
      <CollectionContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CollectionContent({ params, searchParams }: PageProps<"/collections/[slug]">) {
  const collection = await getCollection((await params).slug);
  if (!collection) notFound();
  const brands = collection.kind === "brands" ? (await getBrands()).filter((b) => b.isFeatured) : [];

  return (
    <>
      <PageHeader
        title={collection.title}
        description={collection.description}
        eyebrow="Collection"
        crumbs={[{ name: "Shop All", href: "/shop" }, { name: collection.title, href: `/collections/${collection.slug}` }]}
      />
      {brands.length > 0 && (
        <ul className="container-page -mt-4 mb-10 flex flex-wrap justify-center gap-3">
          {brands.map((b) => (
            <li key={b.slug}>
              <Link href={`/brands/${b.slug}`} className="label block border border-hairline px-5 py-3 transition-colors hover:border-espresso">{b.name}</Link>
            </li>
          ))}
        </ul>
      )}
      <div className="container-page">
        <ProductListing basePath={`/collections/${collection.slug}`} searchParams={searchParams} fixed={{ collection: collection.slug }} />
      </div>
    </>
  );
}
