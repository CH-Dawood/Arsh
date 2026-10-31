import type { Metadata } from "next";
import { Suspense } from "react";
import { Toaster } from "@/components/admin/client";
import { AdminSidebar, AdminTopbar } from "@/components/admin/shell";
import { PageSkeleton } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/catalog";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

/** Renders the page only after the server has confirmed an admin session (redirect or 404 otherwise). */
async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { storeName } = await getSettings();
  return (
    <div className="min-h-dvh bg-canvas text-espresso lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <AdminSidebar storeName={storeName} />
      <div className="min-w-0">
        <AdminTopbar storeName={storeName} />
        <main id="main" className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-8 sm:py-10">
          {isSupabaseConfigured ? (
            <Suspense fallback={<PageSkeleton />}>
              <AdminGate>{children}</AdminGate>
            </Suspense>
          ) : (
            <p className="border border-dashed border-taupe p-6 text-cocoa">The admin dashboard needs the Supabase connection configured in .env.local.</p>
          )}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
