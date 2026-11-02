import Link from "next/link";
import { cn } from "@/lib/format";

const tabs = [
  { key: "general", href: "/admin/settings", label: "General" },
  { key: "policies", href: "/admin/settings/policies", label: "Policies & Pages" },
  { key: "faqs", href: "/admin/settings/faqs", label: "FAQ Management" },
  { key: "options", href: "/admin/settings/options", label: "Sizes & Colours" },
  { key: "storage", href: "/admin/settings/storage", label: "Storage" },
] as const;

/** Section tabs for Admin → Store Settings. */
export function SettingsTabs({ active }: { active: (typeof tabs)[number]["key"] }) {
  return (
    <nav aria-label="Store settings sections" className="-mt-4 mb-8 flex gap-1 overflow-x-auto border-b border-hairline [scrollbar-width:none]">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? "page" : undefined}
          className={cn(
            "-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition-colors",
            active === t.key ? "border-espresso font-medium text-espresso" : "border-transparent text-cocoa hover:text-espresso",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
