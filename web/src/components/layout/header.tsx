"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { Suspense, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { cn, formatPKR } from "@/lib/format";
import { useHydrated } from "@/lib/hooks";
import { cartCount, useCart } from "@/lib/store/cart";
import { useWishlist } from "@/lib/store/wishlist";
import { mainNav, supportNav } from "./nav-links";
import { SearchBox } from "./search-box";

function CurrentNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <ul className="container-page flex justify-center gap-10 pb-4">
      {mainNav.map((item) => {
        const current = pathname === item.href;
        return (
          <li key={item.href}>
            <Link href={item.href} aria-current={current ? "page" : undefined} className="label group relative py-1 text-espresso">
              {item.label}
              <span className={cn(
                "absolute inset-x-0 -bottom-0.5 h-px origin-left bg-gold transition-transform duration-500 ease-luxe",
                current ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
              )} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Header({ storeName, freeShippingThreshold, categories }: {
  storeName: string;
  freeShippingThreshold: number;
  categories: { name: string; slug: string }[];
}) {
  const hydrated = useHydrated();
  const count = useCart((s) => cartCount(s.lines));
  const setCartOpen = useCart((s) => s.setOpen);
  const wishCount = useWishlist((s) => s.slugs.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 40));

  const iconBtn = "relative grid size-11 place-items-center text-espresso transition-colors hover:text-gold-deep";
  const badge = (n: number) =>
    hydrated && n > 0 ? (
      <motion.span
        key={n}
        initial={{ scale: 0.4 }}
        animate={{ scale: 1 }}
        className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-espresso px-1 text-[0.625rem] leading-4 text-ivory"
      >
        {n}
      </motion.span>
    ) : null;

  return (
    <>
      <p className="label bg-espresso px-4 py-2.5 text-center text-[0.625rem] text-ivory">
        Free shipping nationwide on orders above {formatPKR(freeShippingThreshold)}
      </p>

      <header
        className={cn(
          "sticky top-0 z-40 border-b bg-ivory/95 backdrop-blur-md transition-[border-color,box-shadow] duration-500",
          scrolled ? "border-hairline shadow-soft" : "border-transparent",
        )}
      >
        <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-20">
          <div className="flex items-center gap-1">
            <button type="button" className={cn(iconBtn, "-ml-3 lg:hidden")} onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu className="size-5" strokeWidth={1.5} />
            </button>
            <button type="button" className={cn(iconBtn, "lg:hidden")} onClick={() => setSearchOpen(true)} aria-label="Search">
              <Search className="size-5" strokeWidth={1.5} />
            </button>
            <SearchBox className="hidden w-60 lg:block xl:w-72" />
          </div>

          <Link href="/" className="px-2 text-center" aria-label={`${storeName} home`}>
            <span className="block font-display text-2xl font-medium uppercase tracking-[0.32em] sm:text-3xl">
              {storeName}
            </span>
          </Link>

          <div className="-mr-3 flex items-center justify-end">
            <Link href="/account" className={cn(iconBtn, "hidden sm:grid")} aria-label="My account">
              <User className="size-5" strokeWidth={1.5} />
            </Link>
            <Link href="/wishlist" className={cn(iconBtn, "hidden sm:grid")} aria-label={`Wishlist${hydrated ? `, ${wishCount} items` : ""}`}>
              <Heart className="size-5" strokeWidth={1.5} />
              {badge(wishCount)}
            </Link>
            <button type="button" className={iconBtn} onClick={() => setCartOpen(true)} aria-label={`Shopping bag${hydrated ? `, ${count} items` : ""}`}>
              <ShoppingBag className="size-5" strokeWidth={1.5} />
              {badge(count)}
            </button>
          </div>
        </div>

        <nav aria-label="Main" className="hidden lg:block">
          {/* Only the "current page" underline needs the URL, so it streams in without blocking the header. */}
          <Suspense fallback={<NavLinks pathname={null} />}>
            <CurrentNavLinks />
          </Suspense>
        </nav>
      </header>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} side="left" label="Menu">
        <nav aria-label="Mobile" className="flex h-full flex-col overflow-y-auto px-6 pb-8 pt-16">
          <ul className="space-y-1">
            {mainNav.map((item, i) => (
              <motion.li key={item.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + i * 0.04 }}>
                <Link href={item.href} onClick={() => setMenuOpen(false)} className="block py-2.5 font-display text-2xl">
                  {item.label}
                </Link>
              </motion.li>
            ))}
          </ul>
          <p className="label mt-8 text-cocoa">Categories</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-4">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/shop?category=${c.slug}`} onClick={() => setMenuOpen(false)} className="block py-2 text-sm">{c.name}</Link>
              </li>
            ))}
          </ul>
          <div className="mt-auto space-y-1 border-t border-hairline pt-6 text-sm">
            <Link href="/account" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-2"><User className="size-4" strokeWidth={1.5} /> My account</Link>
            <Link href="/wishlist" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-2"><Heart className="size-4" strokeWidth={1.5} /> Wishlist</Link>
            {supportNav.slice(0, 3).map((s) => (
              <Link key={s.href} href={s.href} onClick={() => setMenuOpen(false)} className="block py-2 text-cocoa">{s.label}</Link>
            ))}
          </div>
        </nav>
      </Sheet>

      <Sheet open={searchOpen} onClose={() => setSearchOpen(false)} side="top" label="Search">
        <div className="container-page max-h-[90dvh] overflow-y-auto pb-8 pt-16">
          <SearchBox variant="panel" autoFocus onNavigate={() => setSearchOpen(false)} />
        </div>
      </Sheet>
    </>
  );
}
