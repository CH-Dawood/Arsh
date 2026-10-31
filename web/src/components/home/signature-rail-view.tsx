import { ButtonLink } from "@/components/ui/button";
import { ClothingRailHero, type RailGarment } from "@/components/ui/product-rail-gallery";
import type { HangerConfig } from "@/lib/catalog/types";

export type RailCopy = Pick<HangerConfig, "eyebrow" | "heading" | "subtitle" | "caption" | "ctaLabel" | "ctaHref" | "autoplay" | "interval">;

/**
 * The rail's photo canvas is 200 × 310. Unsplash crops to that shape on its CDN; any other
 * source (Supabase Storage uploads) goes through Next's optimiser at a rail-sized width.
 */
export function railPhoto(url: string) {
  if (url.startsWith("https://images.unsplash.com/")) {
    const u = new URL(url);
    u.search = new URLSearchParams({ auto: "format", fit: "crop", crop: "top", w: "480", h: "744", q: "75" }).toString();
    return u.toString();
  }
  return `/_next/image?url=${encodeURIComponent(url)}&w=640&q=75`;
}

/** The featured piece hangs in the middle of the rail and faces front at rest; the rest keep their order. */
export function centreFeatured(items: RailGarment[], featuredId: string | null) {
  const at = featuredId ? items.findIndex((x) => x.id === featuredId) : -1;
  if (at < 0) return { ordered: items, rest: undefined };
  const others = items.filter((_, i) => i !== at);
  const middle = Math.floor(items.length / 2);
  return { ordered: [...others.slice(0, middle), items[at], ...others.slice(middle)], rest: middle };
}

/** The hanger section's markup. Shared by the homepage and the admin preview, so the preview is exactly what customers see. */
export function SignatureRailView({ config, items, restIndex }: { config: RailCopy | null; items: RailGarment[]; restIndex?: number }) {
  return (
    <section aria-labelledby="signature-rail" className="mt-20 border-y border-hairline sm:mt-28">
      <div className="container-page pt-14 text-center sm:pt-20">
        <p className="label text-gold-deep">{config?.eyebrow ?? "The Arsh Edit"}</p>
        <h2 id="signature-rail" className="mt-3 text-heading">{config?.heading ?? "Signature pieces, on the rail"}</h2>
        {(config ? config.subtitle : true) && (
          <p className="mx-auto mt-4 max-w-xl text-cocoa">
            {config?.subtitle ?? "Brush along the rail, slide a hanger aside, or lift a piece to turn it and see the detail."}
          </p>
        )}
      </div>
      <ClothingRailHero
        aria-labelledby="signature-rail"
        items={items}
        hanger="wood"
        autoplay={config?.autoplay ?? true}
        interval={config?.interval ?? 3200}
        restIndex={restIndex}
        caption={config ? (config.caption ?? undefined) : "Hover or tap a piece to turn it to the front."}
        labels={{ front: "Front", back: "Back", close: "Close", show: "Show", view: "View piece" }}
        action={<ButtonLink href={config?.ctaHref ?? "/shop"} variant="outline">{config?.ctaLabel ?? "Shop the collection"}</ButtonLink>}
        className="pb-6"
      />
    </section>
  );
}
