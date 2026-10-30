import { NextResponse, type NextRequest } from "next/server";
import { getCategories, searchProducts } from "@/lib/catalog";

export type SearchSuggestion = {
  products: { slug: string; name: string; price: number; image: string | null; category: string }[];
  categories: { slug: string; name: string }[];
};

/** Type-ahead suggestions for the header search. Read-only, public catalogue data. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ products: [], categories: [] } satisfies SearchSuggestion);

  const needle = q.toLowerCase();
  const [products, categories] = await Promise.all([searchProducts(q, 6), getCategories()]);

  return NextResponse.json(
    {
      products: products.map((p) => ({
        slug: p.slug, name: p.name, price: p.price, image: p.images[0]?.url ?? null, category: p.category.name,
      })),
      categories: categories.filter((c) => c.name.toLowerCase().includes(needle)).slice(0, 3).map(({ slug, name }) => ({ slug, name })),
    } satisfies SearchSuggestion,
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
  );
}
