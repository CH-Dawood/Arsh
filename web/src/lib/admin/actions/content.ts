"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { GONE, adminAction, dbMessage, fail } from "@/lib/admin/server";
import { isEditableSlug } from "@/lib/policies";
import { cleanDoc, docText } from "@/lib/rich-doc";

const MAX_POLICY = 200_000;
const MAX_ANSWER = 20_000;

/**
 * Validates the editor document (sent as a JSON string) on the server and returns the
 * cleaned JSON to store.
 */
function storedDoc(raw: string, max: number) {
  let doc: unknown = null;
  try { doc = JSON.parse(raw); } catch { /* treated as empty */ }
  const clean = cleanDoc(doc);
  const json = JSON.stringify(clean);
  return { json, text: docText(clean).trim(), tooLong: json.length > max };
}

const policyInput = z.object({
  slug: z.string(),
  title: z.string().trim().min(2, "Enter a title.").max(120),
  is_published: z.boolean(),
  body: z.string().max(MAX_POLICY * 2),
});

export async function savePolicy(input: z.input<typeof policyInput>) {
  return adminAction<{ updatedAt: string }>(async ({ db }) => {
    const parsed = policyInput.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
    const { slug, title, is_published, body } = parsed.data;
    if (!isEditableSlug(slug)) return fail("Unknown page.");
    const doc = storedDoc(body, MAX_POLICY);
    if (doc.tooLong) return fail("This policy is too long to save. Try splitting very long sections.");

    const { data, error } = await db.from("content_pages")
      .upsert({ slug, title, is_published, body: doc.text ? doc.json : "" }, { onConflict: "slug" })
      .select("updated_at")
      .single();
    if (error || !data) return fail(dbMessage(error));
    updateTag(`content:${slug}`);
    return { ok: true, message: is_published ? "Saved and live on the website." : "Saved as a draft (hidden from the website).", data: { updatedAt: data.updated_at } };
  });
}

const faqInput = z.object({
  id: z.uuid().optional(),
  question: z.string().trim().min(5, "Write the question (at least 5 characters).").max(300),
  is_active: z.boolean(),
  answer: z.string().max(MAX_ANSWER * 2),
});

const expireFaqs = () => updateTag("faqs");

export async function saveFaq(input: z.input<typeof faqInput>) {
  return adminAction(async ({ db }) => {
    const parsed = faqInput.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
    const { id, question, is_active, answer } = parsed.data;
    const doc = storedDoc(answer, MAX_ANSWER);
    if (doc.text.length < 2) return fail("Write an answer.");
    if (doc.tooLong) return fail("This answer is too long. Keep FAQ answers short and link to a policy page for details.");

    if (id) {
      const { error, count } = await db.from("faq_items").update({ question, is_active, answer: doc.json }, { count: "exact" }).eq("id", id);
      if (error) return fail(dbMessage(error));
      if (!count) return fail(GONE);
    } else {
      const { data: last } = await db.from("faq_items").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
      const { error } = await db.from("faq_items").insert({ question, is_active, answer: doc.json, sort_order: (last?.sort_order ?? 0) + 10 });
      if (error) return fail(dbMessage(error));
    }
    expireFaqs();
    return { ok: true, message: id ? "FAQ saved." : "FAQ added." };
  });
}

export async function setFaqActive(id: string, isActive: boolean) {
  return adminAction(async ({ db }) => {
    if (!z.uuid().safeParse(id).success) return fail("Unknown FAQ.");
    const { error, count } = await db.from("faq_items").update({ is_active: isActive }, { count: "exact" }).eq("id", id);
    if (error) return fail(dbMessage(error));
    if (!count) return fail(GONE);
    expireFaqs();
    return { ok: true, message: isActive ? "FAQ shown on the website." : "FAQ hidden from the website." };
  });
}

export async function deleteFaq(id: string) {
  return adminAction(async ({ db }) => {
    if (!z.uuid().safeParse(id).success) return fail("Unknown FAQ.");
    const { error, count } = await db.from("faq_items").delete({ count: "exact" }).eq("id", id);
    if (error) return fail(dbMessage(error));
    if (!count) return fail("That FAQ no longer exists. Refresh the page.");
    expireFaqs();
    return { ok: true, message: "FAQ deleted." };
  });
}

/** Saves the full display order (ids top to bottom). */
export async function reorderFaqs(ids: string[]) {
  return adminAction(async ({ db }) => {
    if (!z.array(z.uuid()).max(500).safeParse(ids).success) return fail("Couldn't read the new order.");
    const { error } = await db.rpc("admin_set_order", { p_table: "faq_items", p_ids: ids });
    if (error) return fail(dbMessage(error));
    expireFaqs();
    return { ok: true, message: "FAQ order saved." };
  });
}
