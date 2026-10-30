"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import type { Banner } from "@/lib/catalog/types";
import { cn } from "@/lib/format";
import { motionTokens } from "@/lib/motion/tokens";

const INTERVAL = 4000;

export function HeroSlider({ banners }: { banners: Banner[] }) {
  const reduce = useReducedMotion();
  const [index, setIndexRaw] = useState(0);
  const [changed, setChanged] = useState(false); // first slide renders visible in the server HTML
  const [paused, setPaused] = useState(false); // user toggle
  const [hovering, setHovering] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = banners.length;

  const setIndex = useCallback((next: number | ((i: number) => number)) => {
    setChanged(true);
    setIndexRaw(next);
  }, []);
  const go = useCallback((dir: number) => setIndex((i) => (i + dir + count) % count), [count, setIndex]);

  useEffect(() => {
    if (count < 2 || paused || hovering) return;
    const t = setInterval(() => document.visibilityState === "visible" && go(1), INTERVAL);
    return () => clearInterval(t);
  }, [count, paused, hovering, go]);

  if (!count) return null;
  const current = banners[index];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured collections"
      className="relative h-[min(82svh,52rem)] min-h-[34rem] overflow-hidden bg-linen lg:grid lg:grid-cols-[5fr_7fr]"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      {/* Images: all slides stacked, crossfading; fixed box so nothing shifts. */}
      <div className="absolute inset-0 lg:relative lg:order-2">
        {banners.map((b, i) => (
          <div
            key={b.id}
            className={cn("absolute inset-0 transition-opacity duration-[1.4s] ease-luxe", i === index ? "opacity-100" : "opacity-0")}
            aria-hidden={i !== index}
          >
            <Image
              src={b.image.url}
              alt={b.image.alt}
              fill
              priority={i === 0}
              sizes="(min-width: 1024px) 58vw, 100vw"
              className={cn(
                "object-cover object-[50%_18%] transition-transform ease-out",
                !reduce && (i === index ? "scale-100 duration-[6s]" : "scale-[1.08] duration-0"),
              )}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-espresso/75 via-espresso/15 to-transparent lg:hidden" aria-hidden />
      </div>

      {/* Copy */}
      <div className="relative z-10 flex h-full flex-col justify-end px-5 pb-20 text-ivory sm:px-10 lg:order-1 lg:justify-center lg:px-14 lg:pb-0 lg:text-espresso xl:px-20">
        <motion.div
          key={current.id}
          initial={reduce || !changed ? false : "hidden"}
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${count}`}
          aria-live={paused ? "polite" : "off"}
        >
          {current.promoText && (
            <motion.p variants={fadeUp} className="label text-champagne lg:text-gold-deep">{current.promoText}</motion.p>
          )}
          <motion.h1 variants={fadeUp} className="mt-4 text-display">{current.heading}</motion.h1>
          {current.subheading && (
            <motion.p variants={fadeUp} className="mt-5 max-w-md text-base font-light text-ivory/90 sm:text-lg lg:text-cocoa">
              {current.subheading}
            </motion.p>
          )}
          {current.ctaHref && (
            <motion.div variants={fadeUp} className="mt-8">
              <ButtonLink href={current.ctaHref} size="lg" variant="light" className="lg:bg-espresso lg:text-ivory lg:hover:bg-gold-deep">
                {current.ctaLabel ?? "Shop now"}
              </ButtonLink>
            </motion.div>
          )}
        </motion.div>

        {count > 1 && (
          <div className="absolute bottom-6 left-5 right-24 flex items-center justify-between gap-4 sm:left-10 sm:right-10 lg:bottom-10 lg:left-14 lg:right-14 xl:left-20">
            <div className="flex items-center gap-3">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show slide ${i + 1}: ${b.heading}`}
                  aria-current={i === index}
                  className="group grid h-8 place-items-center"
                >
                  <span className={cn(
                    "block h-px transition-all duration-500 ease-luxe",
                    i === index ? "w-12 bg-ivory lg:bg-espresso" : "w-6 bg-ivory/50 group-hover:bg-ivory lg:bg-espresso/30 lg:group-hover:bg-espresso",
                  )} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPaused((p) => !p)} className={ctrl} aria-label={paused ? "Play slideshow" : "Pause slideshow"}>
                {paused ? <Play className="size-4" strokeWidth={1.5} /> : <Pause className="size-4" strokeWidth={1.5} />}
              </button>
              {/* Phones swipe instead; hiding arrows there keeps them clear of the floating WhatsApp button. */}
              <button type="button" onClick={() => go(-1)} className={cn(ctrl, "max-sm:hidden")} aria-label="Previous slide">
                <ChevronLeft className="size-5" strokeWidth={1.5} />
              </button>
              <button type="button" onClick={() => go(1)} className={cn(ctrl, "max-sm:hidden")} aria-label="Next slide">
                <ChevronRight className="size-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const ctrl = "grid size-11 place-items-center border border-ivory/40 text-ivory transition-colors hover:bg-ivory hover:text-espresso lg:border-espresso/20 lg:text-espresso lg:hover:bg-espresso lg:hover:text-ivory";

const fadeUp = {
  hidden: { opacity: 0, y: motionTokens.distance.lg },
  show: { opacity: 1, y: 0, transition: { duration: motionTokens.duration.slow, ease: motionTokens.easing.luxe } },
};
