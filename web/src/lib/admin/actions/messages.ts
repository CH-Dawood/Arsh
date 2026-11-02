"use server";

import { z } from "zod";
import { GONE, adminAction, dbMessage, fail } from "@/lib/admin/server";

export async function setMessageHandled(id: string, handled: boolean) {
  return adminAction(async ({ db }) => {
    if (!z.uuid().safeParse(id).success) return fail("Unknown message.");
    const { error, count } = await db.from("contact_messages").update({ is_handled: handled }, { count: "exact" }).eq("id", id);
    if (error) return fail(dbMessage(error));
    if (!count) return fail(GONE);
    return { ok: true, message: handled ? "Marked as handled." : "Moved back to new messages." };
  });
}

export async function deleteMessage(id: string) {
  return adminAction(async ({ db }) => {
    if (!z.uuid().safeParse(id).success) return fail("Unknown message.");
    const { error, count } = await db.from("contact_messages").delete({ count: "exact" }).eq("id", id);
    if (error) return fail(dbMessage(error));
    if (!count) return fail(GONE);
    return { ok: true, message: "Message deleted." };
  });
}
