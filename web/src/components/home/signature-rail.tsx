import type { RailGarment } from "@/components/ui/product-rail-gallery";
import { getHanger, getProduct, getProducts } from "@/lib/catalog";
import type { HangerConfig, HangerItem, Product, ProductSummary } from "@/lib/catalog/types";
import { formatPKR } from "@/lib/format";
import { SignatureRailView, centreFeatured, railPhoto } from "./signature-rail-view";

const RAIL_SIZE = 8;
const MIN_PIECES = 3;

/** Pieces featured in the admin lead; then ones with a front and back photo (they turn best), couture and best sellers. */
function pick(items: ProductSummary[], size: number) {
  const score = (p: ProductSummary) =>
    (p.featured ? 8 : 0) + (p.images.length > 1 ? 4 : 0) + (p.badges.includes("luxury") ? 2 : 0) + (p.badges.includes("bestseller") ? 1 : 0);
  return items
    .filter((p) => p.inStock && p.images.length > 0)
    .map((p, i) => ({ p, i, s: score(p) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, size)
    .map((x) => x.p.slug);
}

function sizeRange(p: Product) {
  const codes = p.sizes.map((s) => s.code);
  if (codes.length === 1) return codes[0] === "UNSTITCHED" ? "Unstitched" : codes[0];
  return `Sizes ${codes[0]}–${codes.at(-1)}`;
}

type Piece = { product: Product; item?: HangerItem };

function toGarment({ product: p, item }: Piece): RailGarment {
  const [front, back] = p.images;
  const image = item?.image ?? front?.url;
  const backImage = item?.backImage ?? (item?.image ? undefined : back?.url);
  return {
    id: p.id,
    name: item?.title ?? p.name,
    description: item?.description ?? p.shortDescription,
    image: image ? railPhoto(image) : undefined,
    backImage: backImage ? railPhoto(backImage) : undefined,
    tag: formatPKR(p.price),
    details: [p.pieceCount ? `${p.pieceCount}-piece` : null, p.category.name, sizeRange(p), p.brand?.name ?? null].filter(
      (d): d is string => Boolean(d),
    ),
    href: `/products/${p.slug}`,
  };
}

/** Admin-chosen pieces that can still be sold, topped up with automatic picks if too few remain. */
async function resolvePieces(config: HangerConfig | null): Promise<Piece[]> {
  const limit = config?.maxItems ?? RAIL_SIZE;
  const chosen = config?.items ?? [];
  const resolved = await Promise.all(chosen.map(async (item) => ({ product: await getProduct(item.slug), item })));
  const pieces: Piece[] = resolved
    .flatMap(({ product, item }) => (product?.inStock && (item.image || product.images.length) ? [{ product, item }] : []))
    .slice(0, limit);
  if (pieces.length >= MIN_PIECES) return pieces;

  const { items } = await getProducts({ pageSize: 60 });
  const taken = new Set(pieces.map((x) => x.product.slug));
  const extra = pick(items.filter((p) => !taken.has(p.slug)), limit - pieces.length);
  const more = (await Promise.all(extra.map((slug) => getProduct(slug)))).filter((p): p is Product => Boolean(p));
  return [...pieces, ...more.map((product) => ({ product }))];
}

/** Product ids the rail would pick by itself; the admin offers them as a starting point. */
export async function automaticRailProductIds() {
  return (await resolvePieces(null)).map((x) => x.product.id);
}

export async function SignatureRail() {
  const config = await getHanger();
  if (config && !config.enabled) return null;
  const pieces = await resolvePieces(config);
  if (pieces.length < MIN_PIECES) return null;
  // A featured piece that was hidden, sold out or removed falls back to the first piece the admin chose.
  const featured = config?.featuredProductId && pieces.some((x) => x.product.id === config.featuredProductId)
    ? config.featuredProductId
    : config?.items.length ? pieces[0].product.id : null;
  const { ordered, rest } = centreFeatured(pieces.map(toGarment), featured);

  return <SignatureRailView config={config} items={ordered} restIndex={rest} />;
}
