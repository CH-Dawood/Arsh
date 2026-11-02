"use server";

import { z } from "zod";
import { GONE, adminAction, dbMessage, fail } from "@/lib/admin/server";

export async function setSubscriberStatus(id: string, subscribed: boolean) {
  return adminAction(async ({ db }) => {
    if (!z.uuid().safeParse(id).success) return fail("Unknown subscriber.");
    const { error, count } = await db.from("newsletter_subscribers").update({ status: subscribed ? "subscribed" : "unsubscribed" }, { count: "exact" }).eq("id", id);
    if (error) return fail(dbMessage(error));
    if (!count) return fail(GONE);
    return { ok: true, message: subscribed ? "Marked as subscribed." : "Marked as unsubscribed." };
  });
}

export async function deleteSubscriber(id: string) {
  return adminAction(async ({ db }) => {
    if (!z.uuid().safeParse(id).success) return fail("Unknown subscriber.");
    const { error, count } = await db.from("newsletter_subscribers").delete({ count: "exact" }).eq("id", id);
    if (error) return fail(dbMessage(error));
    if (!count) return fail(GONE);
    return { ok: true, message: "Subscriber deleted." };
  });
}
