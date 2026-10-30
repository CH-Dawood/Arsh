import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Package, RotateCcw, Truck } from "lucide-react";
import { Gallery } from "@/components/product/gallery";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductPurchase } from "@/components/product/product-purchase";
import { ProductBadges } from "@/components/product/badges";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Price } from "@/components/ui/price";
import { SectionHeading } from "@/components/ui/section-heading";
import { getContentPage, getProduct, getProductSlugs, getRelatedProducts, getSettings } from "@/lib/catalog";
import { formatPKR } from "@/lib/format";
import { JsonLd, absoluteUrl, pageMetadata } from "@/lib/seo";

export async function generateStaticParams() {
  return (await getProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  // Resolved before the page streams, so unknown slugs get a real 404 status.
  if (!product) notFound();
  return pageMetadata({
    title: product.name,
    description: product.shortDescription || `${product.name}, ${product.category.name}. ${formatPKR(product.price)}.`,
    path: `/products/${product.slug}`,
    image: product.images[0],
  });
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={params} />
    </Suspense>
  );
}

function ProductSkeleton() {
  return (
    <div className="container-page mt-16 grid animate-pulse gap-10 lg:grid-cols-[7fr_5fr] lg:gap-16" aria-busy="true">
      <div className="aspect-[3/4] bg-champagne" />
      <div className="space-y-5">
        <div className="h-3 w-24 bg-champagne" />
        <div className="h-12 w-4/5 bg-champagne" />
        <div className="h-6 w-32 bg-champagne" />
        <div className="h-24 bg-champagne" />
        <div className="h-14 bg-champagne" />
      </div>
    </div>
  );
}

async function ProductContent({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [related, settings, sizeGuide] = await Promise.all([getRelatedProducts(slug), getSettings(), getContentPage("size-guide")]);
  const inStock = product.variants.some((v) => v.stock > 0);

  const details = [
    { title: "Description", body: <p>{product.description}</p>, open: true },
    {
      title: "Fabric & Embroidery",
      body: (
        <dl className="space-y-3">
          {product.fabric && <div><dt className="font-medium text-espresso">Fabric</dt><dd>{product.fabric}</dd></div>}
          {product.embroidery && <div><dt className="font-medium text-espresso">Embroidery</dt><dd>{product.embroidery}</dd></div>}
          {product.pieceCount && <div><dt className="font-medium text-espresso">Pieces</dt><dd>{product.pieceCount}-piece</dd></div>}
        </dl>
      ),
    },
    ...(product.care ? [{ title: "Care", body: <p>{product.care}</p> }] : []),
    {
      title: "Delivery",
      body: (
        <p>
          Delivered nationwide. Shipping is {formatPKR(settings.shippingFee)}, and free on orders of {formatPKR(settings.freeShippingThreshold)} or more.
          {settings.codEnabled && " Cash on delivery is available."} See our <Link href="/shipping-policy" className="underline underline-offset-4">shipping policy</Link>.
        </p>
      ),
    },
    {
      title: "Returns & Exchange",
      body: <p>Read our <Link href="/refund-policy" className="underline underline-offset-4">refund and return policy</Link> for eligibility and how to request an exchange.</p>,
    },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description,
          sku: product.variants[0]?.sku,
          image: product.images.map((i) => i.url),
          category: product.category.name,
          ...(product.brand && { brand: { "@type": "Brand", name: product.brand.name } }),
          offers: {
            "@type": "Offer",
            url: absoluteUrl(`/products/${product.slug}`),
            priceCurrency: "PKR",
            price: product.price,
            availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
          },
        }}
      />

      <div className="container-page pt-6 sm:pt-8">
        <Breadcrumbs items={[{ name: product.category.name, href: `/shop?category=${product.category.slug}` }, { name: product.name, href: `/products/${product.slug}` }]} />
      </div>

      <div className="container-page mt-6 grid gap-10 lg:grid-cols-[7fr_5fr] lg:gap-16">
        <Gallery images={product.images} name={product.name} />

        <div className="lg:sticky lg:top-32 lg:self-start">
          <ProductBadges badges={product.badges} price={product.price} compareAtPrice={product.compareAtPrice} soldOut={!inStock} className="mb-4 flex-row" />
          {product.brand && (
            <Link href={`/brands/${product.brand.slug}`} className="label text-gold-deep hover:text-espresso">{product.brand.name}</Link>
          )}
          <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">{product.name}</h1>
          <Price price={product.price} compareAtPrice={product.compareAtPrice} showSaving className="mt-4 text-xl" />
          <p className="mt-6 leading-relaxed text-cocoa">{product.shortDescription}</p>

          <div className="mt-8 border-t border-hairline pt-8">
            <ProductPurchase
              product={{ slug: product.slug, name: product.name, price: product.price, compareAtPrice: product.compareAtPrice, image: product.images[0]?.url ?? "", sizes: product.sizes }}
              sizeGuide={sizeGuide?.body ?? ""}
            />
          </div>

          <ul className="mt-8 grid grid-cols-3 gap-3 border-y border-hairline py-5 text-center text-xs text-cocoa">
            <li className="flex flex-col items-center gap-2"><Truck className="size-5 text-espresso" strokeWidth={1.25} aria-hidden />Nationwide delivery</li>
            <li className="flex flex-col items-center gap-2"><Package className="size-5 text-espresso" strokeWidth={1.25} aria-hidden />Free over {formatPKR(settings.freeShippingThreshold)}</li>
            <li className="flex flex-col items-center gap-2"><RotateCcw className="size-5 text-espresso" strokeWidth={1.25} aria-hidden /><Link href="/refund-policy" className="hover:text-espresso">Return policy</Link></li>
          </ul>

          <div className="mt-2 divide-y divide-hairline">
            {details.map((d) => (
              <details key={d.title} open={d.open} className="group py-5">
                <summary className="label flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
                  {d.title}
                  <span className="text-lg transition-transform duration-300 group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <div className="mt-4 text-sm leading-relaxed text-cocoa">{d.body}</div>
              </details>
            ))}
          </div>
        </div>
      </div>

      <section aria-labelledby="reviews" className="container-page mt-24 border-t border-hairline pt-14">
        <h2 id="reviews" className="text-heading">Customer reviews</h2>
        <p className="mt-4 max-w-xl text-cocoa">No reviews yet. Reviews are written by customers who have received this piece and appear here after moderation.</p>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related" className="container-page mt-24">
          <SectionHeading id="related" eyebrow="Complete the look" title="You may also like" className="mb-10" />
          <ProductGrid products={related} />
        </section>
      )}
    </>
  );
}
