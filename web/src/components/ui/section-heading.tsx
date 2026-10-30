import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/format";

export function SectionHeading({ id, eyebrow, title, href, linkLabel = "View all", className, as: Tag = "h2" }: {
  id?: string;
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("flex items-end justify-between gap-6", className)}>
      <div>
        {eyebrow && <p className="label mb-3 text-gold-deep">{eyebrow}</p>}
        <Tag id={id} className="text-heading">{title}</Tag>
      </div>
      {href && (
        <Link
          href={href}
          className="group label flex shrink-0 items-center gap-2 pb-2 text-espresso"
          aria-label={`${linkLabel}: ${title}`}
        >
          <span className="hidden sm:inline">{linkLabel}</span>
          <span className="sm:hidden">All</span>
          <ArrowRight className="size-3.5 transition-transform duration-300 ease-luxe group-hover:translate-x-1" aria-hidden />
        </Link>
      )}
    </div>
  );
}
