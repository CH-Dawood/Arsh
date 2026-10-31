import "server-only";
import { requireAdmin } from "@/lib/auth";

/** Option lists used by the product editor (admin view: includes hidden categories and brands). */
export async function productFormOptions() {
  const { supabase } = await requireAdmin();
  const [categories, brands, sizes, colors] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order").order("name"),
    supabase.from("brands").select("id, name").order("sort_order").order("name"),
    supabase.from("sizes").select("id, code, label").order("sort_order"),
    supabase.from("colors").select("id, name").order("name"),
  ]);
  return {
    categories: categories.data ?? [],
    brands: brands.data ?? [],
    sizes: (sizes.data ?? []).map((s) => ({ id: s.id, code: s.code, name: s.label })),
    colors: colors.data ?? [],
  };
}
