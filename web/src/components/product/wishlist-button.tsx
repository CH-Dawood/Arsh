"use client";

import { Heart } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/format";
import { useHydrated } from "@/lib/hooks";
import { useWishlist } from "@/lib/store/wishlist";

export function WishlistButton({ slug, name, className, withLabel = false }: { slug: string; name: string; className?: string; withLabel?: boolean }) {
  const hydrated = useHydrated();
  const saved = useWishlist((s) => s.slugs.includes(slug)) && hydrated;
  const toggle = useWishlist((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={() => toggle(slug)}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
      className={cn("inline-flex items-center justify-center gap-2 transition-colors", className)}
    >
      <motion.span key={String(saved)} initial={{ scale: saved ? 0.6 : 1 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
        <Heart className={cn("size-5", saved && "fill-espresso")} strokeWidth={1.5} />
      </motion.span>
      {withLabel && <span className="label">{saved ? "Saved" : "Wishlist"}</span>}
    </button>
  );
}
