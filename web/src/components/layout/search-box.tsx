"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Search } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { SearchSuggestion } from "@/app/api/search/route";
import { cn, formatPKR } from "@/lib/format";
import { useDebounced } from "@/lib/hooks";

const empty: SearchSuggestion = { products: [], categories: [] };

/** Header search with type-ahead suggestions (ARIA combobox). Enter submits to /search. */
export function SearchBox({ onNavigate, autoFocus = false, className, variant = "inline" }: {
  onNavigate?: () => void;
  autoFocus?: boolean;
  className?: string;
  variant?: "inline" | "panel";
}) {
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ q: string; data: SearchSuggestion }>({ q: "", data: empty });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebounced(query.trim(), 180);

  useEffect(() => {
    if (debounced.length < 2) return;
    const ctrl = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(debounced)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : empty))
      .then((data: SearchSuggestion) => setResult({ q: debounced, data }))
      .catch(() => {});
    return () => ctrl.abort();
  }, [debounced]);

  const ready = debounced.length >= 2 && result.q === debounced;
  const loading = debounced.length >= 2 && !ready;
  const { products, categories } = ready ? result.data : empty;
  const options = [
    ...categories.map((c) => ({ key: `c-${c.slug}`, href: `/shop?category=${c.slug}` })),
    ...products.map((p) => ({ key: `p-${p.slug}`, href: `/products/${p.slug}` })),
  ];
  const showList = open && query.trim().length >= 2;

  const go = (href: string) => {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); }
    else if (e.key === "Enter" && active >= 0 && options[active]) { e.preventDefault(); go(options[active].href); }
  };

  return (
    <form
      role="search"
      action="/search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const q = query.trim();
        if (q) go(`/search?q=${encodeURIComponent(q)}`);
      }}
    >
      <label htmlFor={`${id}-input`} className="sr-only">Search products</label>
      <div className={cn(
        "flex items-center gap-3 border-b transition-colors duration-300",
        variant === "panel" ? "border-espresso pb-3" : "border-hairline pb-1.5 focus-within:border-espresso",
      )}>
        <Search className={cn("shrink-0", variant === "panel" ? "size-6" : "size-4")} strokeWidth={1.5} aria-hidden />
        <input
          id={`${id}-input`}
          name="q"
          type="search"
          autoComplete="off"
          autoFocus={autoFocus}
          data-autofocus={autoFocus || undefined}
          placeholder={variant === "panel" ? "Search suits, fabrics, colours…" : "Search"}
          value={query}
          maxLength={80}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-${options[active]?.key}` : undefined}
          className={cn(
            "w-full min-w-0 bg-transparent outline-none placeholder:text-cocoa/70 [&::-webkit-search-cancel-button]:hidden",
            variant === "panel" ? "font-display text-2xl sm:text-3xl" : "text-sm",
          )}
        />
        {loading && <LoaderCircle className="size-4 shrink-0 animate-spin text-cocoa" aria-hidden />}
      </div>

      {showList && (
        <div
          id={`${id}-list`}
          role="listbox"
          aria-label="Search suggestions"
          className={cn(
            "z-40 bg-ivory",
            variant === "panel" ? "mt-6" : "absolute left-0 top-full mt-3 w-[min(92vw,26rem)] border border-hairline p-4 shadow-lift",
          )}
        >
          {ready && !options.length && (
            <p className="py-2 text-sm text-cocoa">No matches for “{query.trim()}”. Try a colour, fabric or style.</p>
          )}
          {categories.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {categories.map((c, i) => (
                <Link
                  key={c.slug}
                  id={`${id}-c-${c.slug}`}
                  role="option"
                  aria-selected={active === i}
                  href={`/shop?category=${c.slug}`}
                  onClick={() => { setOpen(false); onNavigate?.(); }}
                  className={cn("label border border-hairline px-3 py-2 transition-colors hover:border-espresso", active === i && "border-espresso")}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
          <ul className="space-y-1">
            {products.map((p, n) => {
              const i = categories.length + n;
              return (
                <li key={p.slug}>
                  <Link
                    id={`${id}-p-${p.slug}`}
                    role="option"
                    aria-selected={active === i}
                    href={`/products/${p.slug}`}
                    onClick={() => { setOpen(false); onNavigate?.(); }}
                    className={cn("flex items-center gap-4 p-2 transition-colors hover:bg-linen", active === i && "bg-linen")}
                  >
                    <span className="relative h-16 w-12 shrink-0 overflow-hidden bg-champagne">
                      {p.image && <Image src={p.image} alt="" fill sizes="48px" className="object-cover" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-display text-lg leading-tight">{p.name}</span>
                      <span className="text-xs text-cocoa">{p.category} · {formatPKR(p.price)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {ready && products.length > 0 && (
            <button type="submit" className="label mt-3 w-full border-t border-hairline pt-3 text-left hover:text-gold-deep">
              See all results for “{query.trim()}”
            </button>
          )}
        </div>
      )}
    </form>
  );
}
