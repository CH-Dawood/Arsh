import "server-only";
import type { AdminContext } from "@/lib/admin/server";

type Db = AdminContext["db"];

/**
 * Every catalog-bucket path the store still uses. Past orders count too, because they keep
 * showing their photo. Returns null if any table can't be read: callers must then delete nothing.
 */
export async function catalogReferences(db: Db): Promise<Set<string> | null> {
  const results = await Promise.all([
    db.from("product_images").select("storage_path").limit(100_000),
    db.from("banners").select("image_path, mobile_image_path").limit(1000),
    db.from("categories").select("image_path").limit(1000),
    db.from("home_sections").select("image_path").limit(1000),
    db.from("hanger_items").select("image_path, back_image_path").limit(1000),
    db.from("store_settings").select("logo_path").limit(1),
    db.from("order_items").select("image_path").limit(1_000_000),
  ]);
  if (results.some((r) => r.error)) return null;
  const refs = new Set<string>();
  for (const { data } of results) {
    for (const row of (data ?? []) as Record<string, string | null>[]) {
      for (const value of Object.values(row)) if (value) refs.add(value);
    }
  }
  return refs;
}

/** Removes the given uploaded files, keeping any that something still uses. A failure is logged, never fatal. */
export async function removeUnusedFiles(db: Db, candidates: (string | null | undefined)[]) {
  const uploaded = [...new Set(candidates)].filter((p): p is string => Boolean(p && !p.startsWith("https://") && !p.startsWith("/")));
  if (!uploaded.length) return;
  const refs = await catalogReferences(db);
  if (!refs) return console.error("storage cleanup skipped: references could not be read");
  const unused = uploaded.filter((p) => !refs.has(p));
  if (!unused.length) return;
  const { error } = await db.storage.from("catalog").remove(unused);
  if (error) console.error("storage cleanup failed", error.message);
}

export type CatalogFile = { path: string; size: number; createdAt: string | null };

/** Lists the catalog bucket, folder by folder. */
export async function listCatalogFiles(db: Db, prefix = "", depth = 0): Promise<CatalogFile[]> {
  if (depth > 4) return [];
  const { data, error } = await db.storage.from("catalog").list(prefix, { limit: 1000 });
  if (error) throw new Error(error.message);
  const files: CatalogFile[] = [];
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    // Folders have no id; ".emptyFolderPlaceholder" is Supabase's own marker.
    if (!item.id) files.push(...(await listCatalogFiles(db, path, depth + 1)));
    else if (item.name !== ".emptyFolderPlaceholder") {
      files.push({ path, size: Number(item.metadata?.size ?? 0), createdAt: item.created_at ?? null });
    }
  }
  return files;
}

/** New uploads may belong to a form still being filled in, so files younger than this are left alone. */
export const UNUSED_MIN_AGE_MS = 24 * 60 * 60 * 1000;
