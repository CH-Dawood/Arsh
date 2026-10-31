"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Re-renders the current admin page when rows change (Supabase Realtime, filtered by RLS so only
 * admins receive order events). Falls back to a 60s refresh while the tab is visible.
 */
export function LiveRefresh({ table, filter }: { table: "orders" | "notification_logs"; filter?: string }) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    };
    const supabase = createClient();
    const channel = supabase
      .channel(`admin-${table}-${filter ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table, ...(filter ? { filter } : {}) }, refresh)
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    const poll = setInterval(() => document.visibilityState === "visible" && router.refresh(), 60_000);
    return () => {
      clearInterval(poll);
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [router, table, filter]);

  return (
    <p className="mb-4 flex items-center gap-2 text-xs text-cocoa" aria-live="polite">
      <span className={`size-2 rounded-full ${live ? "bg-success" : "bg-taupe"}`} aria-hidden />
      {live ? "Live: updates appear automatically" : "Auto-refreshing every minute"}
    </p>
  );
}
