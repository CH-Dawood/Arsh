import { ShieldCheck, Truck } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { formatPKR } from "@/lib/format";

const faces = [
  "[transform:translateZ(3.5rem)]",
  "[transform:rotateY(180deg)_translateZ(3.5rem)]",
  "[transform:rotateY(90deg)_translateZ(3.5rem)]",
  "[transform:rotateY(-90deg)_translateZ(3.5rem)]",
  "[transform:rotateX(90deg)_translateZ(3.5rem)]",
  "[transform:rotateX(-90deg)_translateZ(3.5rem)]",
];

/** Free-shipping promotion with a slowly turning CSS-3D gift box (no WebGL; static under reduced motion). */
export function ShippingPromo({ threshold, codEnabled }: { threshold: number; codEnabled: boolean }) {
  return (
    <section aria-labelledby="free-shipping" className="container-page pt-20 sm:pt-28">
      <Reveal>
        <div className="relative overflow-hidden bg-champagne px-6 py-14 sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border border-gold/30" aria-hidden />
          <div className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full border border-gold/20" aria-hidden />

          <div className="relative grid items-center gap-12 lg:grid-cols-[auto_1fr_auto]">
            <div className="mx-auto [perspective:900px]" aria-hidden>
              <div className="relative size-28 animate-[spin3d_14s_linear_infinite] [transform-style:preserve-3d] motion-reduce:animate-none motion-reduce:[transform:rotateX(-18deg)_rotateY(32deg)]">
                {faces.map((f, i) => (
                  <div key={i} className={`absolute inset-0 grid place-items-center border border-gold/40 bg-ivory/90 ${f}`}>
                    {i < 4 ? <Truck className="size-10 text-gold-deep" strokeWidth={1} /> : <span className="h-full w-3 bg-gold/40" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center lg:text-left">
              <h2 id="free-shipping" className="text-heading tracking-[0.04em]">FREE SHIPPING NATIONWIDE</h2>
              <p className="label mt-4 text-sm text-gold-deep">On Orders Above {formatPKR(threshold)}</p>
            </div>

            <ul className="mx-auto grid gap-4 text-sm text-cocoa">
              <li className="flex items-center gap-3"><Truck className="size-5 text-espresso" strokeWidth={1.25} aria-hidden /> Delivered across Pakistan</li>
              {codEnabled && (
                <li className="flex items-center gap-3"><ShieldCheck className="size-5 text-espresso" strokeWidth={1.25} aria-hidden /> Cash on delivery available</li>
              )}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
