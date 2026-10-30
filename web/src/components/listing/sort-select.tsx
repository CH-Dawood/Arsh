"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const options = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="label text-cocoa">Sort</span>
      <select
        value={params.get("sort") ?? "newest"}
        disabled={pending}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          if (e.target.value === "newest") next.delete("sort");
          else next.set("sort", e.target.value);
          next.delete("page");
          startTransition(() => router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
        }}
        className="h-10 cursor-pointer border border-hairline bg-transparent px-3 pr-8 outline-none focus:border-espresso"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
