import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/listing/page-header";
import { getBrands, getProducts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Brands", description: "Explore our labels, from everyday prêt to bridal couture.", path: "/brands" });

export default async function BrandsPage() {
  const brands = await getBrands();
  const covers = await Promise.all(brands.map((b) => getProducts({ brand: b.slug, pageSize: 1 })));

  return (
    <>
      <PageHeader title="Brands" eyebrow="Our labels" description="Each label has its own point of view, from everyday prêt to heirloom couture." crumbs={[{ name: "Brands", href: "/brands" }]} />
      <ul className="container-page grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b, i) => {
          const cover = covers[i].items[0]?.images[0];
          return (
            <li key={b.slug}>
              <Link href={`/brands/${b.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-champagne">
                  {cover && <Image src={cover.url} alt="" fill sizes="(min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw" className="object-cover object-top transition-transform duration-[1.4s] ease-luxe group-hover:scale-105" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso/60 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-ivory">
                    <h2 className="text-3xl">{b.name}</h2>
                    {b.description && <p className="mt-2 text-sm text-ivory/80">{b.description}</p>}
                    <p className="label mt-4 text-[0.625rem]">{covers[i].total} pieces · Explore</p>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
