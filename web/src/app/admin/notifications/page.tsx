import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Suspense } from "react";
import { LiveRefresh } from "@/components/admin/live-refresh";
import { NotificationStatus } from "@/components/admin/notification-status";
import {
  ConnectionCheck, NotificationSettingsForm, RetryButton, SendQueuedButton, TestMessageForm, type NotificationSettingsValue,
} from "@/components/admin/notifications-manager";
import { AdminPageHeader, Card, DataTable, EmptyState, Pagination, SelectInput, Skeleton, StatCard, AdminButton, formatDateTime } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { NOTIFICATION_EVENTS, notificationEvents, type NotificationEvent } from "@/lib/notification-templates";
import { listTemplates, whatsappConfig } from "@/lib/whatsapp";

export const metadata = { title: "WhatsApp Notifications" };
const PAGE = 25;
const STATUSES = ["pending", "sending", "sent", "delivered", "read", "failed"] as const;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const eventLabel = (e: string) => (e === "test" ? "Test message" : notificationEvents[e as NotificationEvent]?.label ?? e);

export default function NotificationsPage({ searchParams }: PageProps<"/admin/notifications">) {
  return (
    <>
      <LiveRefresh table="notification_logs" />
      <AdminPageHeader
        title="WhatsApp Notifications"
        description="Automatic order updates sent through the official WhatsApp Business Cloud API."
        actions={<SendQueuedButton disabled={!whatsappConfig.configured} />}
      />
      <Suspense fallback={<Skeleton className="h-[40rem]" />}>
        <NotificationsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NotificationsContent({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(one(sp.status)) ? (one(sp.status) as (typeof STATUSES)[number]) : "";
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);
  const { supabase } = await requireAdmin();

  const count = (s: (typeof STATUSES)[number][]) =>
    supabase.from("notification_logs").select("id", { count: "exact", head: true }).in("status", s).then((r) => r.count ?? 0);

  let logsQuery = supabase
    .from("notification_logs")
    .select("id, order_id, phone, event, template_name, status, error, attempts, created_at, sent_at, order:orders(order_number)", { count: "exact" });
  if (status) logsQuery = logsQuery.eq("status", status);

  const [{ data: settings }, { data: store }, queued, sent, failed, logsRes, templates] = await Promise.all([
    supabase.from("notification_settings").select("enabled, events").eq("id", 1).maybeSingle(),
    supabase.from("store_settings").select("whatsapp_number").eq("id", 1).maybeSingle(),
    count(["pending", "sending"]),
    count(["sent", "delivered", "read"]),
    count(["failed"]),
    logsQuery.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1),
    listTemplates(),
  ]);
  const { data: logs, count: total, error } = logsRes;

  const stored = (settings?.events ?? {}) as Partial<Record<NotificationEvent, { enabled?: boolean; template?: string; language?: string }>>;
  const initial: NotificationSettingsValue = {
    enabled: settings?.enabled ?? false,
    events: Object.fromEntries(
      NOTIFICATION_EVENTS.map((e) => [e, { enabled: stored[e]?.enabled ?? true, template: stored[e]?.template ?? e, language: stored[e]?.language ?? "en" }]),
    ) as NotificationSettingsValue["events"],
  };
  const approved = templates?.filter((t) => t.status === "APPROVED") ?? null;
  const missingTemplates = approved
    ? NOTIFICATION_EVENTS.filter((e) => initial.events[e].enabled && !approved.some((t) => t.name === initial.events[e].template && t.language === initial.events[e].language))
    : [];

  const checks = [
    { ok: whatsappConfig.hasToken, label: "Access token", env: "WHATSAPP_ACCESS_TOKEN" },
    { ok: whatsappConfig.hasPhoneNumberId, label: "Phone number ID", env: "WHATSAPP_PHONE_NUMBER_ID" },
    { ok: whatsappConfig.hasBusinessAccountId, label: "Business account ID (template check)", env: "WHATSAPP_BUSINESS_ACCOUNT_ID" },
    { ok: whatsappConfig.hasWebhook, label: "Delivery receipts webhook", env: "WHATSAPP_WEBHOOK_VERIFY_TOKEN + WHATSAPP_APP_SECRET" },
  ];
  const href = (p: number) => {
    const u = new URLSearchParams();
    if (status) u.set("status", status);
    if (p > 1) u.set("page", String(p));
    return `/admin/notifications${u.size ? `?${u}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Integration"
          value={whatsappConfig.configured ? "Configured" : "Not set up"}
          tone={whatsappConfig.configured ? "#3f6b4f" : "#b7791f"}
          hint={whatsappConfig.configured ? `Graph API ${whatsappConfig.apiVersion}` : "Messages queue until credentials are added"}
        />
        <StatCard label="Queued" value={queued} tone="#b7791f" href="/admin/notifications?status=pending" />
        <StatCard label="Sent" value={sent} tone="#3f6b4f" hint="Accepted, delivered or read" href="/admin/notifications?status=sent" />
        <StatCard label="Failed" value={failed} tone="#9b2c2c" href="/admin/notifications?status=failed" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <Card title="Connection">
            <div className="space-y-4 p-5">
              <ul className="space-y-2 text-sm">
                {checks.map((c) => (
                  <li key={c.env} className="flex items-start gap-2">
                    {c.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />}
                    <span>
                      {c.label} <span className="text-cocoa">— {c.ok ? "set" : "missing"}</span>
                      {!c.ok && <code className="block text-xs text-cocoa">{c.env}</code>}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-sm">
                Business number shown to customers:{" "}
                {store?.whatsapp_number ? <strong>+{store.whatsapp_number}</strong> : <span className="text-cocoa">not set</span>}{" "}
                <Link href="/admin/settings" className="text-xs underline">Edit</Link>
              </p>
              <ConnectionCheck configured={whatsappConfig.configured} />
              {approved && missingTemplates.length > 0 && (
                <p className="border-l-2 border-warning bg-ivory px-3 py-2 text-xs">
                  No approved template found for: {missingTemplates.map((e) => `${initial.events[e].template} (${initial.events[e].language})`).join(", ")}. These messages will fail until Meta approves them.
                </p>
              )}
              {!whatsappConfig.configured && (
                <div className="border-t border-hairline pt-4 text-sm">
                  <p className="font-medium">To finish setup</p>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-cocoa">
                    <li>In Meta Business Manager, create a WhatsApp Business app and add your business phone number.</li>
                    <li>Create a system user with the <code>whatsapp_business_messaging</code> permission and generate a permanent token.</li>
                    <li>Submit the six templates below (category: Utility, language: English) and wait for approval.</li>
                    <li>Add the environment variables listed above on the server (never in the browser), then redeploy.</li>
                    <li>Point the webhook to <code>/api/whatsapp/webhook</code> and subscribe to <code>messages</code> for delivery receipts.</li>
                    <li>Send a test message from this page.</li>
                  </ol>
                </div>
              )}
            </div>
          </Card>
          <TestMessageForm configured={whatsappConfig.configured} templates={approved?.filter((t) => t.name === "hello_world") ?? []} />
        </div>
        <NotificationSettingsForm initial={initial} configured={whatsappConfig.configured} />
      </div>

      <Card title="Message history">
        <form className="flex flex-wrap items-center gap-2 border-b border-hairline p-4">
          <label className="sr-only" htmlFor="n-status">Status</label>
          <SelectInput id="n-status" name="status" defaultValue={status} className="w-48">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </SelectInput>
          <AdminButton type="submit" variant="outline">Filter</AdminButton>
          {status && <Link href="/admin/notifications" className="px-2 text-sm underline underline-offset-4">Clear</Link>}
        </form>
        {error ? (
          <EmptyState title="Couldn't load messages">Please refresh the page.</EmptyState>
        ) : !logs?.length ? (
          <EmptyState title={status ? "No messages with this status" : "No messages yet"}>
            Messages appear here when customers who opted in place orders or their order status changes.
          </EmptyState>
        ) : (
          <>
            <DataTable>
              <thead>
                <tr><th>Event</th><th>Order</th><th>To</th><th>Status</th><th>Tries</th><th>Created</th><th /></tr>
              </thead>
              <tbody>
                {logs.map((n) => {
                  const order = n.order as unknown as { order_number: string } | null;
                  return (
                    <tr key={n.id}>
                      <td>{eventLabel(n.event)}<span className="block text-xs text-cocoa">{n.template_name}</span></td>
                      <td>{order && n.order_id ? <Link href={`/admin/orders/${n.order_id}`} className="underline-offset-4 hover:underline">{order.order_number}</Link> : <span className="text-cocoa">—</span>}</td>
                      <td className="tabular-nums">+{n.phone}</td>
                      <td><NotificationStatus status={n.status} error={n.error} /></td>
                      <td className="tabular-nums">{n.attempts}</td>
                      <td className="whitespace-nowrap text-cocoa">{formatDateTime(n.created_at)}</td>
                      <td className="text-right">{n.status === "failed" && <RetryButton id={n.id} disabled={!whatsappConfig.configured} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
            <Pagination page={page} pageCount={Math.max(1, Math.ceil((total ?? 0) / PAGE))} href={href} />
          </>
        )}
      </Card>
    </div>
  );
}
