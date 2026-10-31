"use client";

import Image from "next/image";
import { ZoomIn } from "lucide-react";
import { useRef, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import type { CatalogImage } from "@/lib/catalog/types";
import { cn } from "@/lib/format";

/**
 * Product gallery: thumbnails + main image with a hover zoom lens on desktop,
 * swipeable strip on phones, and a full-screen viewer for close-up detail.
 */
export function Gallery({ images, name }: { images: CatalogImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const strip = useRef<HTMLDivElement>(null);

  const select = (i: number) => {
    setActive(i);
    strip.current?.children[i]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  if (!images.length) {
    return (
      <div className="grid aspect-[3/4] place-items-center bg-champagne text-sm text-cocoa" role="img" aria-label={`${name}: photos coming soon`}>
        Photos coming soon
      </div>
    );
  }

  return (
    // The thumbnail column only exists with 2+ photos; otherwise the main photo takes the full width.
    <div className={cn(images.length > 1 && "lg:grid lg:grid-cols-[5rem_1fr] lg:gap-4")}>
      {images.length > 1 && (
        <ul className="hidden flex-col gap-3 lg:flex" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => select(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === active}
                className={cn("relative block aspect-[3/4] w-full overflow-hidden bg-champagne transition-opacity", i === active ? "ring-1 ring-espresso" : "opacity-60 hover:opacity-100")}
              >
                <Image src={img.url} alt="" fill sizes="80px" loading="eager" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <div
          ref={strip}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] lg:block lg:overflow-hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            setActive(Math.round(el.scrollLeft / el.clientWidth));
          }}
        >
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setFullscreen(true)}
              onPointerMove={(e) => {
                // Zoom lens position via CSS variables: no React re-render per mouse move.
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--zx", `${((e.clientX - r.left) / r.width) * 100}%`);
                e.currentTarget.style.setProperty("--zy", `${((e.clientY - r.top) / r.height) * 100}%`);
              }}
              aria-label={`Open full-screen view of ${name}, image ${i + 1}`}
              className={cn(
                "group/zoom relative aspect-[3/4] w-full shrink-0 snap-start overflow-hidden bg-champagne lg:cursor-zoom-in",
                i !== active && "lg:hidden",
              )}
            >
              <Image
                src={img.url}
                alt={img.alt}
                fill
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover transition-transform duration-300 ease-out [transform-origin:var(--zx,50%)_var(--zy,50%)] lg:group-hover/zoom:scale-[2]"
              />
            </button>
          ))}
        </div>
        <span className="label pointer-events-none absolute bottom-4 right-4 flex items-center gap-2 bg-ivory/85 px-3 py-2 text-[0.625rem] backdrop-blur-sm">
          <ZoomIn className="size-3.5" aria-hidden /> <span className="hidden lg:inline">Hover to zoom ·</span> Tap to enlarge
        </span>
        {images.length > 1 && (
          <div className="mt-3 flex justify-center gap-2 lg:hidden" aria-hidden>
            {images.map((img, i) => (
              <span key={img.url} className={cn("h-px w-6 transition-colors", i === active ? "bg-espresso" : "bg-taupe/50")} />
            ))}
          </div>
        )}
      </div>

      <Sheet open={fullscreen} onClose={() => setFullscreen(false)} side="center" label={`${name} images`} className="w-[min(96vw,72rem)]">
        <div className="flex snap-x snap-mandatory overflow-x-auto bg-champagne">
          {images.map((img) => (
            <div key={img.url} className="relative h-[88dvh] w-full shrink-0 snap-center">
              <Image src={img.url} alt={img.alt} fill sizes="96vw" quality={90} className="object-contain" />
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
