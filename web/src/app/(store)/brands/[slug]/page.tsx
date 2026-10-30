import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/listing/page-header";
import { ProductListing } from "@/components/listing/product-listing";
import { ProductGridSkeleton } from "@/components/product/product-grid";
import { getBrands } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

const findBrand = async (slug: string) => (await getBrands()).find((b) => b.slug === slug) ?? null;

export async function generateStaticParams() {
  return (await getBrands()).map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: PageProps<"/brands/[slug]">): Promise<Metadata> {
  const brand = await findBrand((await params).slug);
  if (!brand) notFound();
  return pageMetadata({ title: brand.name, description: brand.description ?? `Shop ${brand.name}.`, path: `/brands/${brand.slug}` });
}

export default function BrandPage({ params, searchParams }: PageProps<"/brands/[slug]">) {
  return (
    <Suspense fallback={<div className="container-page pt-40"><ProductGridSkeleton /></div>}>
      <BrandContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function BrandContent({ params, searchParams }: PageProps<"/brands/[slug]">) {
  const brand = await findBrand((await params).slug);
  if (!brand) notFound();
  return (
    <>
      <PageHeader title={brand.name} eyebrow="Brand" description={brand.description} crumbs={[{ name: "Brands", href: "/brands" }, { name: brand.name, href: `/brands/${brand.slug}` }]} />
      <div className="container-page">
        <ProductListing basePath={`/brands/${brand.slug}`} searchParams={searchParams} fixed={{ brand: brand.slug }} />
      </div>
    </>
  );
}
