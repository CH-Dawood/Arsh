import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import type { Collection } from "@/lib/catalog/types";

export function CategoryGrid({ collections }: { collections: Collection[] }) {
  return (
    <section aria-labelledby="shop-by-category" className="container-page pt-20 sm:pt-28">
      <Reveal className="text-center">
        <p className="label text-gold-deep">Curated for you</p>
        <h2 id="shop-by-category" className="mt-3 text-heading">Shop by Category</h2>
      </Reveal>

      <ul className="-mx-4 mt-10 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-6 lg:gap-4">
        {collections.map((c, i) => (
          <li key={c.slug} className="w-[44vw] shrink-0 snap-start sm:w-auto">
            <Reveal delay={i * 0.06}>
              <Link href={`/collections/${c.slug}`} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-champagne">
                  <Image
                    src={c.image.url}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 16vw, (min-width: 640px) 31vw, 44vw"
                    className="object-cover object-top transition-transform duration-[1.4s] ease-luxe group-hover:scale-[1.06]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso/55 via-transparent to-transparent transition-opacity duration-700 group-hover:opacity-80" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-ivory">
                    <h3 className="font-display text-xl leading-tight sm:text-2xl">{c.title}</h3>
                    <span className="mt-2 block h-px w-8 origin-left bg-champagne transition-transform duration-700 ease-luxe group-hover:scale-x-[2.5]" />
                  </div>
                </div>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
