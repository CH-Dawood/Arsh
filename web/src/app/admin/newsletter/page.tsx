import Link from "next/link";
import { Suspense } from "react";
import { SubscriberActions } from "@/components/admin/subscriber-actions";
import { AdminPageHeader, Card, DataTable, EmptyState, Pagination, Skeleton, formatDateTime } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Newsletter" };
const PAGE = 50;

export default function NewsletterPage({ searchParams }: PageProps<"/admin/newsletter">) {
  return (
    <>
      <AdminPageHeader
        title="Newsletter"
        description="People who signed up in the website footer. The store doesn't send email itself: export this list to use with your email service."
        actions={<Link href="/admin/newsletter/export" className="inline-flex h-10 items-center justify-center border border-hairline bg-paper px-4 text-sm font-medium text-espresso transition-colors hover:border-espresso">Export CSV</Link>}
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Subscribers searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Subscribers({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).page;
  const page = Math.max(1, Number.parseInt(Array.isArray(raw) ? raw[0] : raw ?? "", 10) || 1);
  const { supabase } = await requireAdmin();
  const { data, count, error } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, status, source, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  const rows = data ?? [];

  return (
    <Card title={`${count ?? 0} ${count === 1 ? "person" : "people"}`}>
      {error ? <EmptyState title="Couldn't load subscribers">Please refresh the page.</EmptyState>
        : !rows.length ? <EmptyState title="No subscribers yet">Sign-ups from the website footer appear here.</EmptyState>
        : (
          <>
            <DataTable>
              <thead><tr><th>Email</th><th>Status</th><th>Signed up</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td className="break-all font-medium">{s.email}</td>
                    <td className={s.status === "subscribed" ? "" : "text-cocoa"}>{s.status === "subscribed" ? "Subscribed" : "Unsubscribed"}</td>
                    <td className="text-cocoa">{formatDateTime(s.created_at)}</td>
                    <td><SubscriberActions id={s.id} email={s.email} subscribed={s.status === "subscribed"} /></td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination page={page} pageCount={Math.max(1, Math.ceil((count ?? 0) / PAGE))} href={(p) => (p > 1 ? `/admin/newsletter?page=${p}` : "/admin/newsletter")} />
          </>
        )}
    </Card>
  );
}
