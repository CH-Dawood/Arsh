import Link from "next/link";
import { Suspense } from "react";
import { ProductGrid, ProductGridSkeleton } from "@/components/product/product-grid";
import { ButtonLink } from "@/components/ui/button";
import { getCategories, getProducts } from "@/lib/catalog";
import type { ProductQuery, SortKey } from "@/lib/catalog/types";
import { cn } from "@/lib/format";
import { SortSelect } from "./sort-select";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SIZES = [
  { code: "XS", label: "XS" }, { code: "S", label: "S" }, { code: "M", label: "M" },
  { code: "L", label: "L" }, { code: "XL", label: "XL" }, { code: "UNSTITCHED", label: "Unstitched" },
];
const SORTS: SortKey[] = ["newest", "price-asc", "price-desc"];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Filterable, paginated product grid. All state lives in the URL, so every view is shareable. */
export function ProductListing(props: { basePath: string; searchParams: SearchParams; fixed?: ProductQuery; categoryFilter?: boolean }) {
  return (
    <Suspense fallback={<ProductGridSkeleton />}>
      <Listing {...props} />
    </Suspense>
  );
}

async function Listing({ basePath, searchParams, fixed = {}, categoryFilter = false }: Parameters<typeof ProductListing>[0]) {
  const sp = await searchParams;
  const sort = SORTS.find((s) => s === one(sp.sort)) ?? "newest";
  const size = SIZES.find((s) => s.code === one(sp.size))?.code;
  const category = fixed.category ?? (categoryFilter ? one(sp.category) : undefined);
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);

  const [result, categories] = await Promise.all([
    getProducts({ ...fixed, sort, size, category, page }),
    categoryFilter ? getCategories() : Promise.resolve([]),
  ]);

  const href = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { sort: sort === "newest" ? undefined : sort, size, category: fixed.category ? undefined : category, page: undefined, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && next.set(k, v));
    return `${basePath}${next.size ? `?${next}` : ""}`;
  };

  const chip = (active: boolean) =>
    cn("label shrink-0 border px-3.5 py-2.5 text-[0.625rem] transition-colors", active ? "border-espresso bg-espresso text-ivory" : "border-hairline hover:border-espresso");

  return (
    <div>
      <div className="flex flex-col gap-5 border-y border-hairline py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4">
          {categoryFilter && (
            <nav aria-label="Filter by category" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
              <Link href={href({ category: undefined })} className={chip(!category)} aria-current={!category ? "true" : undefined}>All</Link>
              {categories.map((c) => (
                <Link key={c.slug} href={href({ category: c.slug })} className={chip(category === c.slug)} aria-current={category === c.slug ? "true" : undefined}>
                  {c.name}
                </Link>
              ))}
            </nav>
          )}
          <nav aria-label="Filter by size" className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
            <span className="label mr-1 text-cocoa">Size</span>
            {SIZES.map((s) => (
              <Link key={s.code} href={href({ size: size === s.code ? undefined : s.code })} className={chip(size === s.code)} aria-current={size === s.code ? "true" : undefined}>
                {s.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center justify-between gap-6">
          <p className="text-sm text-cocoa" aria-live="polite">{result.total} {result.total === 1 ? "piece" : "pieces"}</p>
          <SortSelect />
        </div>
      </div>

      {result.items.length ? (
        <ProductGrid products={result.items} className="mt-10" priorityCount={4} />
      ) : (
        <div className="py-24 text-center">
          <p className="font-display text-3xl">Nothing matches these filters</p>
          <p className="mt-3 text-cocoa">Try another size or category.</p>
          <ButtonLink href={basePath} variant="outline" className="mt-8">Clear filters</ButtonLink>
        </div>
      )}

      {result.pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2">
          {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={href({ page: n > 1 ? String(n) : undefined })}
              aria-current={n === result.page ? "page" : undefined}
              className={cn("grid size-11 place-items-center border text-sm", n === result.page ? "border-espresso bg-espresso text-ivory" : "border-hairline hover:border-espresso")}
            >
              {n}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
