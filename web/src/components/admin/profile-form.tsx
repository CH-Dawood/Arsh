"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveAdminProfile } from "@/lib/admin/actions/profile";
import { toastResult } from "@/lib/admin/toast";
import { AdminButton, FieldRow, TextInput } from "./ui";

export function ProfileForm({ initial }: { initial: { full_name: string; phone: string } }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveAdminProfile(v);
          if (toastResult(res) && res.ok) router.refresh();
        });
      }}
    >
      <FieldRow label="Full name" htmlFor="p-name">
        <TextInput id="p-name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} autoComplete="name" required maxLength={120} />
      </FieldRow>
      <FieldRow label="Mobile" htmlFor="p-phone" hint="Shown to other admins in order history.">
        <TextInput id="p-phone" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} inputMode="tel" autoComplete="tel" placeholder="0300 1234567" />
      </FieldRow>
      <div><AdminButton type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</AdminButton></div>
    </form>
  );
}
