import Link from "next/link";
import { Suspense } from "react";
import { MessageActions } from "@/components/admin/message-actions";
import { AdminPageHeader, Card, EmptyState, Pagination, Skeleton, formatDateTime } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/format";

export const metadata = { title: "Messages" };
const PAGE = 25;
const FILTERS = [{ key: "new", label: "New" }, { key: "handled", label: "Handled" }, { key: "all", label: "All" }] as const;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  return (
    <>
      <AdminPageHeader title="Messages" description="What customers send through the Contact page. Replying by email or phone happens outside the store; mark a message as handled once you have." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Messages searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Messages({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === one(sp.filter))?.key ?? "new";
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);
  const { supabase } = await requireAdmin();

  let query = supabase.from("contact_messages").select("id, name, email, phone, subject, message, is_handled, created_at", { count: "exact" });
  if (filter !== "all") query = query.eq("is_handled", filter === "handled");
  const { data, count, error } = await query.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const rows = data ?? [];
  const href = (f: string, p = 1) => `/admin/messages?${new URLSearchParams({ filter: f, ...(p > 1 && { page: String(p) }) })}`;

  return (
    <Card>
      <nav aria-label="Filter messages" className="flex gap-1 border-b border-hairline px-3 pt-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={href(f.key)}
            aria-current={filter === f.key ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm", filter === f.key ? "border-espresso font-medium" : "border-transparent text-cocoa hover:text-espresso")}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {error ? <EmptyState title="Couldn't load messages">Please refresh the page.</EmptyState>
        : !rows.length ? <EmptyState title={filter === "new" ? "No new messages" : "No messages here"}>Messages from the Contact page appear here.</EmptyState>
        : (
          <>
            <ul className="divide-y divide-hairline">
              {rows.map((m) => (
                <li key={m.id} className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="font-medium">{m.name}{m.subject && <span className="font-normal text-cocoa"> · {m.subject}</span>}</p>
                    <p className="text-xs text-cocoa">{formatDateTime(m.created_at)}</p>
                  </div>
                  <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <a href={`mailto:${m.email}`} className="break-all underline underline-offset-4">{m.email}</a>
                    {m.phone && <a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`} className="underline underline-offset-4">{m.phone}</a>}
                  </p>
                  <p className="whitespace-pre-line break-words text-sm text-cocoa">{m.message}</p>
                  <MessageActions id={m.id} handled={m.is_handled} name={m.name} />
                </li>
              ))}
            </ul>
            <Pagination page={page} pageCount={Math.max(1, Math.ceil((count ?? 0) / PAGE))} href={(p) => href(filter, p)} />
          </>
        )}
    </Card>
  );
}
