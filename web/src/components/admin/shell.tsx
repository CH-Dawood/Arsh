"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, Boxes, ExternalLink, FolderTree, GalleryHorizontal, LayoutDashboard, LogOut, Mail, Menu, MessageCircle, Package, Settings, ShieldCheck, Shirt, ShoppingBag, Tags, UserRound, Users,
} from "lucide-react";
import { Suspense, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/format";

const nav = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", Icon: ShoppingBag },
  { href: "/admin/products", label: "Products", Icon: Package },
  { href: "/admin/categories", label: "Categories", Icon: FolderTree },
  { href: "/admin/brands", label: "Brands & Labels", Icon: Tags },
  { href: "/admin/banners", label: "Homepage Banners", Icon: GalleryHorizontal },
  { href: "/admin/hanger", label: "3D Hanger", Icon: Shirt },
  { href: "/admin/customers", label: "Customers", Icon: Users },
  { href: "/admin/messages", label: "Messages", Icon: Mail },
  { href: "/admin/inventory", label: "Inventory", Icon: Boxes },
  { href: "/admin/notifications", label: "WhatsApp", Icon: MessageCircle },
  { href: "/admin/analytics", label: "Sales & Analytics", Icon: BarChart3 },
  { href: "/admin/settings", label: "Store Settings", Icon: Settings },
  { href: "/admin/access", label: "Admin Access", Icon: ShieldCheck },
  { href: "/admin/profile", label: "Profile", Icon: UserRound },
] as const;

function NavLinks({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {nav.map(({ href, label, Icon, ...rest }) => {
        const active = pathname !== null && ("exact" in rest ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm transition-colors",
                active ? "bg-espresso text-ivory" : "text-espresso hover:bg-champagne/60",
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.6} aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function CurrentNav({ onNavigate }: { onNavigate?: () => void }) {
  return <NavLinks pathname={usePathname()} onNavigate={onNavigate} />;
}

function SidebarBody({ storeName, onNavigate }: { storeName: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-7">
        <Link href="/admin" onClick={onNavigate} className="font-display text-2xl uppercase tracking-[0.3em]">{storeName}</Link>
        <p className="label mt-1 text-[0.625rem] text-cocoa">Admin</p>
      </div>
      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3">
        <Suspense fallback={<NavLinks pathname={null} />}>
          <CurrentNav onNavigate={onNavigate} />
        </Suspense>
      </nav>
      <div className="space-y-1 border-t border-hairline px-3 py-4">
        <Link href="/" target="_blank" className="flex items-center gap-3 px-3 py-2 text-sm text-cocoa hover:text-espresso">
          <ExternalLink className="size-4" strokeWidth={1.6} aria-hidden /> View store
        </Link>
        <form action={logout}>
          <button type="submit" className="flex w-full items-center gap-3 px-3 py-2 text-sm text-cocoa hover:text-danger">
            <LogOut className="size-4" strokeWidth={1.6} aria-hidden /> Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export function AdminSidebar({ storeName }: { storeName: string }) {
  return (
    <aside className="sticky top-0 hidden h-dvh border-r border-hairline bg-ivory lg:block">
      <SidebarBody storeName={storeName} />
    </aside>
  );
}

export function AdminTopbar({ storeName }: { storeName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-hairline bg-ivory/95 px-4 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="-ml-2 grid size-10 place-items-center" aria-label="Open admin menu">
          <Menu className="size-5" strokeWidth={1.5} />
        </button>
        <span className="font-display text-xl uppercase tracking-[0.3em]">{storeName}</span>
        <span className="label text-[0.625rem] text-cocoa">Admin</span>
      </header>
      <Sheet open={open} onClose={() => setOpen(false)} side="left" label="Admin menu">
        <SidebarBody storeName={storeName} onNavigate={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
