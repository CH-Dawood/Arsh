import { Reveal } from "@/components/motion/reveal";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/ui/section-heading";
import type { ProductSummary } from "@/lib/catalog/types";
import { cn } from "@/lib/format";

/** A home-page collection: horizontal scroller on phones, 4 columns on tablets/laptops, 5 on wide screens. */
export function ProductRail({ title, eyebrow, href, products }: {
  title: string;
  eyebrow?: string;
  href: string;
  products: ProductSummary[];
}) {
  if (!products.length) return null;
  const id = `rail-${href.split("/").pop()}`;
  return (
    <section aria-labelledby={id} className="container-page pt-20 sm:pt-28">
      <Reveal>
        <SectionHeading id={id} eyebrow={eyebrow} title={title} href={href} />
      </Reveal>
      <ul className="-mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] md:mx-0 md:mt-10 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0 xl:grid-cols-5">
        {products.slice(0, 5).map((p, i) => (
          <li key={p.id} className={cn("w-[68vw] shrink-0 snap-start sm:w-[42vw] md:w-auto", i === 4 && "md:max-xl:hidden")}>
            <Reveal delay={i * 0.06}>
              <ProductCard product={p} />
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
