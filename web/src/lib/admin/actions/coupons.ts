"use server";

import { z } from "zod";
import { GONE, adminAction, dbMessage, fail } from "@/lib/admin/server";

const optInt = (label: string, min: number) => z.union([z.literal(""), z.coerce.number({ error: `${label} must be a number.` }).int(`${label} must be a whole number.`).min(min, `${label} must be at least ${min}.`).max(10_000_000)]).transform((v) => (v === "" ? null : v));
const optDate = z.union([z.literal(""), z.iso.datetime({ offset: true })]).transform((v) => v || null);

const couponInput = z.object({
  id: z.uuid().optional(),
  code: z.string().trim().regex(/^[A-Za-z0-9_-]{3,30}$/, "Codes are 3 to 30 letters, numbers, dashes or underscores.").transform((v) => v.toUpperCase()),
  description: z.string().trim().max(200).transform((v) => v || null),
  discount_type: z.enum(["percent", "fixed"]),
  value: z.coerce.number({ error: "Enter the discount." }).int("The discount must be a whole number.").positive("Enter a discount above zero.").max(10_000_000),
  max_discount: optInt("Maximum discount", 1),
  min_order_amount: z.coerce.number().int().min(0, "Minimum order can't be negative.").max(10_000_000),
  starts_at: optDate,
  expires_at: optDate,
  usage_limit: optInt("Total uses", 1),
  per_customer_limit: optInt("Uses per customer", 1),
  is_active: z.boolean(),
});
export type CouponInput = z.input<typeof couponInput>;

export async function saveCoupon(input: CouponInput) {
  return adminAction(async ({ db }) => {
    const parsed = couponInput.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
    const { id, ...row } = parsed.data;
    if (row.discount_type === "percent" && row.value > 100) return fail("A percentage discount can't be more than 100.");
    if (row.discount_type === "fixed") row.max_discount = null;
    if (row.starts_at && row.expires_at && new Date(row.expires_at) <= new Date(row.starts_at)) return fail("The end date must be after the start date.");

    if (id) {
      const { error, count } = await db.from("coupons").update(row, { count: "exact" }).eq("id", id);
      if (error) return fail(error.code === "23505" ? "That code is already used by another coupon." : dbMessage(error));
      if (!count) return fail(GONE);
    } else {
      const { error } = await db.from("coupons").insert(row);
      if (error) return fail(error.code === "23505" ? "That code is already used by another coupon." : dbMessage(error));
    }
    return { ok: true, message: id ? "Coupon saved." : "Coupon added." };
  });
}

export async function setCouponActive(id: string, active: boolean) {
  return adminAction(async ({ db }) => {
    if (!z.uuid().safeParse(id).success) return fail("Unknown coupon.");
    const { error, count } = await db.from("coupons").update({ is_active: active }, { count: "exact" }).eq("id", id);
    if (error) return fail(dbMessage(error));
    if (!count) return fail(GONE);
    return { ok: true, message: active ? "Coupon can be used at checkout." : "Coupon switched off." };
  });
}

/** A used coupon stays: deleting it would erase its redemption history. It can be switched off instead. */
export async function deleteCoupon(id: string) {
  return adminAction(async ({ db }) => {
    if (!z.uuid().safeParse(id).success) return fail("Unknown coupon.");
    const { count: used, error: usedError } = await db.from("coupon_redemptions").select("order_id", { count: "exact", head: true }).eq("coupon_id", id);
    if (usedError) return fail(dbMessage(usedError));
    if (used) return fail("This coupon has been used on orders, so it can't be deleted. Switch it off instead.");
    const { error, count } = await db.from("coupons").delete({ count: "exact" }).eq("id", id);
    if (error) return fail(dbMessage(error));
    if (!count) return fail(GONE);
    return { ok: true, message: "Coupon deleted." };
  });
}
