"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { grantSecondAdmin, linkSecondAdmin, revokeSecondAdmin } from "@/lib/admin/actions/access";
import { toastResult } from "@/lib/admin/toast";
import { ConfirmDialog } from "./client";
import { AdminButton, Card, FieldRow, TextInput, formatDateTime } from "./ui";

export interface AccessRow { slot: number; email: string; is_owner: boolean; linked: boolean; account_exists: boolean; linked_at: string | null; created_at: string }

export function AccessManager({ rows, isOwner }: { rows: AccessRow[]; isOwner: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const second = rows.find((r) => r.slot === 2);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    start(async () => {
      if (toastResult(await fn())) {
        after?.();
        router.refresh();
      }
    });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title="Administrators (2 maximum)">
        <ul className="divide-y divide-hairline">
          {rows.map((r) => (
            <li key={r.slot} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
              <div className="min-w-0">
                <p className="break-all font-medium">{r.email}</p>
                <p className="text-xs text-cocoa">
                  {r.is_owner ? "Owner" : "Second admin"} ·{" "}
                  {r.linked ? `Active${r.linked_at ? ` since ${formatDateTime(r.linked_at)}` : ""}`
                    : r.account_exists ? "An account with this email exists but isn't linked yet"
                    : "No account uses this exact email yet. Check the spelling, or ask them to sign up with it"}
                </p>
              </div>
              {!r.is_owner && isOwner && (
                <div className="flex gap-2">
                  {!r.linked && r.account_exists && (
                    <AdminButton size="sm" disabled={pending} onClick={() => run(linkSecondAdmin)}>Link account</AdminButton>
                  )}
                  <AdminButton size="sm" variant="outline" className="text-danger" onClick={() => setConfirmRevoke(true)}>Remove</AdminButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {isOwner && !second && (
        <Card title="Add the second admin">
          <form
            className="space-y-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => grantSecondAdmin(email), () => setEmail(""));
            }}
          >
            <FieldRow label="Email address *" htmlFor="a-email" hint="They sign up (or sign in) with exactly this email. Access starts once the email is confirmed.">
              <TextInput id="a-email" type="email" required maxLength={254} autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FieldRow>
            <AdminButton type="submit" disabled={pending || !email.trim()}>{pending ? "Saving…" : "Authorise admin"}</AdminButton>
          </form>
        </Card>
      )}

      <Card title="How access works">
        <ul className="list-disc space-y-2 py-4 pl-10 pr-5 text-sm text-cocoa">
          <li>Only these two email addresses can open the admin. Every other account is a customer account.</li>
          <li>Access needs a signed-in account whose email matches exactly. It starts automatically once they confirm their email from the link Supabase sends; if no confirmation email was sent, use <strong>Link account</strong>. Changing that account&apos;s email removes access.</li>
          <li>Both admins can manage everything in the store: products, brands, categories, stock, orders, customers, banners, the 3D hanger and settings.</li>
          <li>Only the owner can add, link or remove the second admin, and there can never be a third.</li>
          <li>To change the owner email, contact your developer: it can only be changed in the database.</li>
        </ul>
      </Card>

      <ConfirmDialog
        open={confirmRevoke}
        title={`Remove admin access for ${second?.email ?? "the second admin"}?`}
        destructive
        confirmLabel="Remove access"
        pending={pending}
        onCancel={() => setConfirmRevoke(false)}
        onConfirm={() => run(revokeSecondAdmin, () => setConfirmRevoke(false))}
      >
        Their account stays, as a customer account. You can add an admin again afterwards.
      </ConfirmDialog>
    </div>
  );
}
