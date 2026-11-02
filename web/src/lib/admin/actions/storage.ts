"use server";

import { z } from "zod";
import { adminAction, fail } from "@/lib/admin/server";
import { UNUSED_MIN_AGE_MS, catalogReferences, listCatalogFiles } from "@/lib/admin/storage";

const input = z.array(z.string().min(3).max(500)).min(1).max(500);

/** Deletes files the admin picked, re-checking each one now: it must exist, be unused and be old enough. */
export async function deleteUnusedFiles(paths: string[]) {
  return adminAction(async ({ db }) => {
    const parsed = input.safeParse(paths);
    if (!parsed.success) return fail("Choose at least one file.");
    const [refs, files] = await Promise.all([catalogReferences(db), listCatalogFiles(db)]);
    if (!refs) return fail("Couldn't check which files are in use, so nothing was deleted. Please try again.");

    const now = Date.now();
    const deletable = new Set(files
      .filter((f) => !refs.has(f.path) && f.createdAt && now - new Date(f.createdAt).getTime() >= UNUSED_MIN_AGE_MS)
      .map((f) => f.path));
    const safe = parsed.data.filter((p) => deletable.has(p));
    const kept = parsed.data.length - safe.length;
    if (!safe.length) return fail("Those files are now in use or too new, so nothing was deleted. Refresh the page.");

    const { data, error } = await db.storage.from("catalog").remove(safe);
    if (error) return fail(`Delete failed: ${error.message}`);
    const removed = data?.length ?? 0;
    return { ok: true, message: `${removed} file${removed === 1 ? "" : "s"} deleted.${kept ? ` ${kept} kept because ${kept === 1 ? "it is" : "they are"} now in use or too new.` : ""}` };
  });
}
