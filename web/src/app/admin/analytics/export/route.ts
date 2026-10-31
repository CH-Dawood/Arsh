import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/admin/server";
import { paymentMethodLabel, paymentStatusLabel, statusLabel, type OrderStatus, type PaymentStatus } from "@/lib/orders";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Neutralises spreadsheet formulas (CSV injection) and quotes every cell. */
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** Order report as CSV for a date range. Admin only (checked here, and again by RLS). */
export async function GET(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return new NextResponse("Not found", { status: 404 });

  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "";
  if (!ISO.test(from) || !ISO.test(to) || from > to) return new NextResponse("Invalid date range", { status: 400 });

  const { data, error } = await admin.db
    .from("orders")
    .select("order_number, created_at, customer_name, phone, email, city, status, payment_method, payment_status, subtotal, discount_total, shipping_fee, total, coupon_code, courier, tracking_number, order_items(quantity)")
    .gte("created_at", `${from}T00:00:00+05:00`)
    .lte("created_at", `${to}T23:59:59.999+05:00`)
    .order("created_at")
    .limit(10_000);
  if (error) return new NextResponse("Could not build the report", { status: 500 });

  const header = ["Order", "Placed (PKT)", "Customer", "Phone", "Email", "City", "Status", "Payment method", "Payment status", "Items", "Subtotal", "Discount", "Shipping", "Total", "Coupon", "Courier", "Tracking number"];
  const fmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Karachi" });
  const lines = (data ?? []).map((o) => [
    o.order_number, fmt.format(new Date(o.created_at)), o.customer_name, o.phone, o.email, o.city,
    statusLabel[o.status as OrderStatus] ?? o.status, paymentMethodLabel[o.payment_method] ?? o.payment_method,
    paymentStatusLabel[o.payment_status as PaymentStatus] ?? o.payment_status,
    o.order_items.reduce((n, i) => n + i.quantity, 0), o.subtotal, o.discount_total, o.shipping_fee, o.total, o.coupon_code, o.courier, o.tracking_number,
  ].map(cell).join(","));

  // BOM so Excel opens UTF-8 (Urdu names, "Prêt") correctly.
  return new NextResponse(`﻿${[header.map(cell).join(","), ...lines].join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders_${from}_to_${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
