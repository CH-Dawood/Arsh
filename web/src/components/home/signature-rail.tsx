import { ButtonLink } from "@/components/ui/button";
import { ClothingRailHero, type RailGarment } from "@/components/ui/product-rail-gallery";
import { getProduct, getProducts } from "@/lib/catalog";
import type { Product, ProductSummary } from "@/lib/catalog/types";
import { formatPKR } from "@/lib/format";

const RAIL_SIZE = 8;

/**
 * The rail's photo canvas is 200 × 310. Unsplash crops to that shape on its CDN; any other
 * source (Supabase Storage uploads) goes through Next's optimiser at a rail-sized width.
 */
function railPhoto(url: string) {
  if (url.startsWith("https://images.unsplash.com/")) {
    const u = new URL(url);
    u.search = new URLSearchParams({ auto: "format", fit: "crop", crop: "top", w: "480", h: "744", q: "75" }).toString();
    return u.toString();
  }
  return `/_next/image?url=${encodeURIComponent(url)}&w=640&q=75`;
}

/** Pieces featured in the admin lead; then ones with a front and back photo (they turn best), couture and best sellers. */
function pick(items: ProductSummary[]) {
  const score = (p: ProductSummary) =>
    (p.featured ? 8 : 0) + (p.images.length > 1 ? 4 : 0) + (p.badges.includes("luxury") ? 2 : 0) + (p.badges.includes("bestseller") ? 1 : 0);
  return items
    .filter((p) => p.inStock && p.images.length > 0)
    .map((p, i) => ({ p, i, s: score(p) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, RAIL_SIZE)
    .map((x) => x.p.slug);
}

function sizeRange(p: Product) {
  const codes = p.sizes.map((s) => s.code);
  if (codes.length === 1) return codes[0] === "UNSTITCHED" ? "Unstitched" : codes[0];
  return `Sizes ${codes[0]}–${codes.at(-1)}`;
}

function toGarment(p: Product): RailGarment {
  const [front, back] = p.images;
  return {
    id: p.id,
    name: p.name,
    description: p.shortDescription,
    image: railPhoto(front.url),
    backImage: back ? railPhoto(back.url) : undefined,
    tag: formatPKR(p.price),
    details: [p.pieceCount ? `${p.pieceCount}-piece` : null, p.category.name, sizeRange(p), p.brand?.name ?? null].filter(
      (d): d is string => Boolean(d),
    ),
    href: `/products/${p.slug}`,
  };
}

export async function SignatureRail() {
  const { items } = await getProducts({ pageSize: 60 });
  const products = (await Promise.all(pick(items).map((slug) => getProduct(slug)))).filter((p): p is Product => Boolean(p));
  if (products.length < 3) return null;

  return (
    <section aria-labelledby="signature-rail" className="mt-20 border-y border-hairline sm:mt-28">
      <div className="container-page pt-14 text-center sm:pt-20">
        <p className="label text-gold-deep">The Arsh Edit</p>
        <h2 id="signature-rail" className="mt-3 text-heading">Signature pieces, on the rail</h2>
        <p className="mx-auto mt-4 max-w-xl text-cocoa">
          Brush along the rail, slide a hanger aside, or lift a piece to turn it and see the detail.
        </p>
      </div>
      <ClothingRailHero
        aria-labelledby="signature-rail"
        items={products.map(toGarment)}
        hanger="wood"
        autoplay
        interval={3200}
        caption="Hover or tap a piece to turn it to the front."
        labels={{ front: "Front", back: "Back", close: "Close", show: "Show", view: "View piece" }}
        action={<ButtonLink href="/shop" variant="outline">Shop the collection</ButtonLink>}
        className="pb-6"
      />
    </section>
  );
}
