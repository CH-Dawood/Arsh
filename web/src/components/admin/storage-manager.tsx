"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteUnusedFiles } from "@/lib/admin/actions/storage";
import { toastResult } from "@/lib/admin/toast";
import { ConfirmDialog } from "./client";
import { AdminButton, Card, EmptyState, formatDateTime } from "./ui";

export interface UnusedFile { path: string; url: string; size: number; createdAt: string | null; tooNew: boolean }

const kb = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export function StorageManager({ total, unused }: { total: number; unused: UnusedFile[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const toggle = (path: string, on: boolean) => setPicked((s) => { const next = new Set(s); if (on) next.add(path); else next.delete(path); return next; });

  return (
    <>
      <Card
        title={`${unused.length} unused of ${total} file${total === 1 ? "" : "s"}`}
        actions={unused.length > 0 && <AdminButton size="sm" variant="danger" disabled={!picked.size || pending} onClick={() => setConfirming(true)}>Delete selected ({picked.size})</AdminButton>}
      >
        {unused.length === 0 ? (
          <EmptyState title="Nothing to clean up">Every uploaded file is in use.</EmptyState>
        ) : (
          <>
            <p className="border-b border-hairline px-5 py-3 text-xs text-cocoa">
              These files aren&apos;t used by any product, banner, category, homepage tile, hanger piece, logo or past order. Files newer than 24 hours can&apos;t be chosen, in case they belong to a form still being filled in.
            </p>
            <ul className="divide-y divide-hairline">
              {unused.map((f) => (
                <li key={f.path} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <input type="checkbox" className="size-4 shrink-0 accent-espresso" disabled={f.tooNew || pending} checked={picked.has(f.path)} onChange={(e) => toggle(f.path, e.target.checked)} aria-label={`Select ${f.path}`} />
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="relative size-14 shrink-0 overflow-hidden bg-champagne">
                    <Image src={f.url} alt="" fill sizes="56px" className="object-cover" />
                  </a>
                  <div className="min-w-0 flex-1">
                    <p className="break-all">{f.path}</p>
                    <p className="text-xs text-cocoa">{kb(f.size)}{f.createdAt && ` · Uploaded ${formatDateTime(f.createdAt)}`}{f.tooNew && " · Too new to delete"}</p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={confirming}
        title={`Delete ${picked.size} file${picked.size === 1 ? "" : "s"}?`}
        destructive
        confirmLabel="Delete files"
        pending={pending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => start(async () => {
          const ok = toastResult(await deleteUnusedFiles([...picked]));
          setConfirming(false);
          if (ok) {
            setPicked(new Set());
            router.refresh();
          }
        })}
      >
        Each file is checked again before it is deleted. This can&apos;t be undone.
      </ConfirmDialog>
    </>
  );
}
