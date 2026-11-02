"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSubscriber, setSubscriberStatus } from "@/lib/admin/actions/newsletter";
import { toastResult } from "@/lib/admin/toast";
import { ConfirmDialog } from "./client";
import { AdminButton } from "./ui";

export function SubscriberActions({ id, email, subscribed }: { id: string; email: string; subscribed: boolean }) {
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
    <div className="flex justify-end gap-1">
      <AdminButton size="sm" variant="outline" disabled={pending} onClick={() => run(() => setSubscriberStatus(id, !subscribed))}>
        {subscribed ? "Unsubscribe" : "Resubscribe"}
      </AdminButton>
      <AdminButton size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => setConfirming(true)}>Delete</AdminButton>
      <ConfirmDialog
        open={confirming}
        title={`Delete ${email}?`}
        destructive
        confirmLabel="Delete subscriber"
        pending={pending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => run(() => deleteSubscriber(id))}
      >
        This removes them from the list and can&apos;t be undone.
      </ConfirmDialog>
    </div>
  );
}
