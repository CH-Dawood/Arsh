"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteMessage, setMessageHandled } from "@/lib/admin/actions/messages";
import { toastResult } from "@/lib/admin/toast";
import { ConfirmDialog } from "./client";
import { AdminButton } from "./ui";

export function MessageActions({ id, handled, name }: { id: string; handled: boolean; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      if (toastResult(await fn())) {
        setConfirming(false);
        router.refresh();
      }
    });

  return (
    <div className="flex flex-wrap gap-2">
      <AdminButton size="sm" variant={handled ? "outline" : "solid"} disabled={pending} onClick={() => run(() => setMessageHandled(id, !handled))}>
        {handled ? "Mark as new" : "Mark as handled"}
      </AdminButton>
      <AdminButton size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => setConfirming(true)}>Delete</AdminButton>
      <ConfirmDialog
        open={confirming}
        title={`Delete the message from ${name}?`}
        destructive
        confirmLabel="Delete message"
        pending={pending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => run(() => deleteMessage(id))}
      >
        This can&apos;t be undone. To keep it for your records, mark it as handled instead.
      </ConfirmDialog>
    </div>
  );
}
