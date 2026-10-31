"use client";

import { useRouter } from "next/navigation";
import { RefreshCw, Send, Wifi } from "lucide-react";
import { useState, useTransition } from "react";
import {
  checkWhatsAppConnection,
  retryNotification,
  saveNotificationSettings,
  sendQueuedNow,
  sendTestNotification,
} from "@/lib/admin/actions/notifications";
import { toastResult } from "@/lib/admin/toast";
import { NOTIFICATION_EVENTS, notificationEvents, type NotificationEvent } from "@/lib/notification-templates";
import { Toggle } from "./client";
import { AdminButton, Card, FieldRow, TextInput } from "./ui";

type EventConfig = { enabled: boolean; template: string; language: string };
export type NotificationSettingsValue = { enabled: boolean; events: Record<NotificationEvent, EventConfig> };

/** Live connection check against Meta; shows only what WhatsApp itself returns. */
export function ConnectionCheck({ configured }: { configured: boolean }) {
  const [pending, start] = useTransition();
  const [info, setInfo] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="space-y-2">
      <AdminButton
        variant="outline"
        size="sm"
        disabled={!configured || pending}
        onClick={() =>
          start(async () => {
            const res = await checkWhatsAppConnection();
            toastResult(res);
            setInfo({
              ok: res.ok,
              text: res.ok && res.data
                ? [res.message, res.data.quality && `Quality rating: ${res.data.quality}`, res.data.verification && `Verification: ${res.data.verification}`].filter(Boolean).join(" · ")
                : res.message ?? "Connection failed.",
            });
          })
        }
      >
        <Wifi className="size-4" aria-hidden /> {pending ? "Checking…" : "Check connection"}
      </AdminButton>
      {info && <p className={info.ok ? "text-xs text-success" : "text-xs text-danger"}>{info.text}</p>}
    </div>
  );
}

export function NotificationSettingsForm({ initial, configured }: { initial: NotificationSettingsValue; configured: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const setEvent = (e: NotificationEvent, patch: Partial<EventConfig>) =>
    setV((s) => ({ ...s, events: { ...s.events, [e]: { ...s.events[e], ...patch } } }));

  return (
    <Card
      title="Automatic messages"
      actions={
        <AdminButton
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await saveNotificationSettings(v);
              toastResult(res);
              if (res.ok) router.refresh();
            })
          }
        >
          {pending ? "Saving…" : "Save"}
        </AdminButton>
      }
    >
      <div className="space-y-5 p-5">
        <Toggle
          checked={v.enabled}
          onChange={(enabled) => setV((s) => ({ ...s, enabled }))}
          label="Send WhatsApp order updates"
          description={configured
            ? "Customers who ticked the WhatsApp box at checkout get a message for each event turned on below."
            : "You can turn this on now: messages queue up and are sent once the credentials are added. Nothing is reported as sent until WhatsApp accepts it."}
        />
        <ul className="divide-y divide-hairline border-y border-hairline">
          {NOTIFICATION_EVENTS.map((e) => {
            const meta = notificationEvents[e];
            const cfg = v.events[e];
            return (
              <li key={e} className="space-y-3 py-4">
                <Toggle checked={cfg.enabled} disabled={!v.enabled} onChange={(enabled) => setEvent(e, { enabled })} label={meta.label} description={meta.trigger} />
                <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                  <FieldRow label="Approved template name" htmlFor={`t-${e}`}>
                    <TextInput id={`t-${e}`} value={cfg.template} onChange={(x) => setEvent(e, { template: x.target.value })} spellCheck={false} />
                  </FieldRow>
                  <FieldRow label="Language" htmlFor={`l-${e}`}>
                    <TextInput id={`l-${e}`} value={cfg.language} onChange={(x) => setEvent(e, { language: x.target.value })} spellCheck={false} />
                  </FieldRow>
                </div>
                <details className="text-xs text-cocoa">
                  <summary className="cursor-pointer select-none">Template text to submit to Meta</summary>
                  <p className="mt-2 border-l-2 border-champagne bg-ivory px-3 py-2 text-espresso">{meta.body}</p>
                </details>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

export function TestMessageForm({ configured, templates }: { configured: boolean; templates: { name: string; language: string }[] }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [template, setTemplate] = useState(templates[0]?.name ?? "hello_world");
  const [language, setLanguage] = useState(templates[0]?.language ?? "en_US");
  const [pending, start] = useTransition();

  return (
    <Card title="Send a test message">
      <form
        className="grid gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await sendTestNotification({ phone, template, language });
            toastResult(res);
            router.refresh();
          });
        }}
      >
        <FieldRow label="Mobile number" htmlFor="test-phone" hint="The number must have WhatsApp. Test messages are not linked to any order.">
          <TextInput id="test-phone" inputMode="tel" placeholder="0300 1234567" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </FieldRow>
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <FieldRow label="Template" htmlFor="test-template" hint="Needs an approved template with no variables, e.g. hello_world.">
            <TextInput id="test-template" value={template} onChange={(e) => setTemplate(e.target.value)} spellCheck={false} />
          </FieldRow>
          <FieldRow label="Language" htmlFor="test-lang">
            <TextInput id="test-lang" value={language} onChange={(e) => setLanguage(e.target.value)} spellCheck={false} />
          </FieldRow>
        </div>
        <div>
          <AdminButton type="submit" disabled={!configured || pending}>
            <Send className="size-4" aria-hidden /> {pending ? "Sending…" : "Send test"}
          </AdminButton>
          {!configured && <p className="mt-2 text-xs text-cocoa">Available once WhatsApp is configured.</p>}
        </div>
      </form>
    </Card>
  );
}

export function SendQueuedButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <AdminButton
      variant="outline"
      disabled={disabled || pending}
      onClick={() => start(async () => { toastResult(await sendQueuedNow()); router.refresh(); })}
    >
      <Send className="size-4" aria-hidden /> {pending ? "Sending…" : "Send queued now"}
    </AdminButton>
  );
}

export function RetryButton({ id, disabled }: { id: string; disabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <AdminButton
      variant="outline"
      size="sm"
      disabled={disabled || pending}
      onClick={() => start(async () => { toastResult(await retryNotification(id)); router.refresh(); })}
    >
      <RefreshCw className={pending ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden /> Retry
    </AdminButton>
  );
}
