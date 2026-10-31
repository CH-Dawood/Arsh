"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { setProductActive } from "@/lib/admin/actions/products";
import { toastResult } from "@/lib/admin/toast";

export function ProductVisibilityToggle({ id, active, name }: { id: string; active: boolean; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(active);
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={shown}
        disabled={pending}
        aria-label={`Show ${name} in the store`}
        onChange={(e) => {
          const next = e.target.checked;
          start(async () => {
            setShown(next);
            if (toastResult(await setProductActive(id, next))) router.refresh();
          });
        }}
      />
      <span className="h-6 w-11 rounded-full bg-taupe/60 transition-colors peer-checked:bg-espresso peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-gold-deep" />
      <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-paper shadow transition-transform peer-checked:translate-x-5" />
    </label>
  );
}
