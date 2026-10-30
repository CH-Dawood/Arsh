import { CategoryGrid } from "@/components/home/category-grid";
import { HeroSlider } from "@/components/home/hero-slider";
import { ProductRail } from "@/components/home/product-rail";
import { ShippingPromo } from "@/components/home/shipping-promo";
import { SignatureRail } from "@/components/home/signature-rail";
import { getBanners, getCollections, getProducts, getSettings } from "@/lib/catalog";
import { JsonLd, absoluteUrl } from "@/lib/seo";

const eyebrows: Record<string, string> = {
  "new-arrivals": "Just landed",
  "luxury-collection": "Couture",
  "2-piece-set": "Coordinated",
  brands: "Our labels",
  "ready-to-wear": "Prêt",
  "best-sellers": "Most loved",
};

export default async function HomePage() {
  const [banners, collections, settings] = await Promise.all([getBanners(), getCollections(), getSettings()]);
  const rails = await Promise.all(collections.map((c) => getProducts({ collection: c.slug, pageSize: 5 })));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", "@id": absoluteUrl("/#org"), name: settings.storeName, url: absoluteUrl("/") },
            {
              "@type": "WebSite",
              name: settings.storeName,
              url: absoluteUrl("/"),
              publisher: { "@id": absoluteUrl("/#org") },
              potentialAction: {
                "@type": "SearchAction",
                target: { "@type": "EntryPoint", urlTemplate: absoluteUrl("/search?q={search_term_string}") },
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }}
      />
      <HeroSlider banners={banners} />
      <CategoryGrid collections={collections} />
      {collections.map((c, i) => (
        <ProductRail key={c.slug} title={c.title} eyebrow={eyebrows[c.slug]} href={`/collections/${c.slug}`} products={rails[i].items} />
      ))}
      <ShippingPromo threshold={settings.freeShippingThreshold} codEnabled={settings.codEnabled} />
      <SignatureRail />
    </>
  );
}
