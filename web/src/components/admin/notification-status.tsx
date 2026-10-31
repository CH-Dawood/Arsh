const meta: Record<string, { label: string; tone: string }> = {
  pending: { label: "Queued", tone: "#b7791f" },
  sending: { label: "Sending", tone: "#b7791f" },
  sent: { label: "Accepted by WhatsApp", tone: "#2b6cb0" },
  delivered: { label: "Delivered", tone: "#3f6b4f" },
  read: { label: "Read", tone: "#3f6b4f" },
  failed: { label: "Failed", tone: "#9b2c2c" },
};

/** "Sent" means WhatsApp accepted it; "Delivered"/"Read" only appear after WhatsApp's own receipt. */
export function NotificationStatus({ status, error }: { status: string; error?: string | null }) {
  const m = meta[status] ?? { label: status, tone: "#6b5d52" };
  return (
    <span className="inline-flex flex-col">
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="size-1.5 rounded-full" style={{ background: m.tone }} aria-hidden />
        {m.label}
      </span>
      {status === "failed" && error && <span className="max-w-xs text-xs text-danger">{error}</span>}
    </span>
  );
}
