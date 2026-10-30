import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/listing/page-header";
import { SearchBox } from "@/components/layout/search-box";
import { ProductGrid, ProductGridSkeleton } from "@/components/product/product-grid";
import { ButtonLink } from "@/components/ui/button";
import { searchProducts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Search", description: "Search our collection.", path: "/search", noIndex: true });

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <PageHeader title="Search" crumbs={[{ name: "Search", href: "/search" }]} />
      <div className="container-page">
        <div className="mx-auto max-w-2xl">
          <SearchBox variant="panel" />
        </div>
        <Suspense fallback={<div className="mt-14"><ProductGridSkeleton /></div>}>
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 80) ?? "";
  if (!q) return <p className="mt-14 text-center text-cocoa">Search by name, fabric, colour, category or brand.</p>;

  const results = await searchProducts(q, 48);
  return (
    <section aria-live="polite" className="mt-14">
      <p className="mb-8 text-sm text-cocoa">
        {results.length} {results.length === 1 ? "result" : "results"} for <span className="text-espresso">“{q}”</span>
      </p>
      {results.length ? (
        <ProductGrid products={results} />
      ) : (
        <div className="py-16 text-center">
          <p className="font-display text-3xl">No pieces found</p>
          <p className="mt-3 text-cocoa">Check the spelling, or try a broader term such as “lawn” or “embroidered”.</p>
          <ButtonLink href="/shop" variant="outline" className="mt-8">Browse all</ButtonLink>
        </div>
      )}
    </section>
  );
}
