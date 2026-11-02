import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin/server";

/** Neutralises spreadsheet formulas (CSV injection) and quotes every cell. */
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** Current subscribers as CSV. Admin only (checked here, and again by RLS). */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return new NextResponse("Not found", { status: 404 });

  const { data, error } = await admin.db
    .from("newsletter_subscribers")
    .select("email, created_at")
    .eq("status", "subscribed")
    .order("created_at")
    .limit(100_000);
  if (error) return new NextResponse("Could not build the list", { status: 500 });

  const rows = [["email", "signed_up"], ...(data ?? []).map((s) => [s.email, s.created_at])];
  return new NextResponse(rows.map((r) => r.map(cell).join(",")).join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="newsletter-subscribers.csv"',
      "Cache-Control": "no-store",
    },
  });
}
