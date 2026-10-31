import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";
import { isOrderStatus, paymentStatusLabel, statusLabel, statusTone, type PaymentStatus } from "@/lib/orders";

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl leading-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-cocoa">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, title, actions, children, ...rest }: ComponentProps<"section"> & { title?: string; actions?: ReactNode }) {
  return (
    // min-w-0 lets a card shrink inside grid layouts, so wide tables scroll within it instead of widening the page.
    <section className={cn("min-w-0 border border-hairline bg-paper", className)} {...rest}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4">
          {title && <h2 className="label text-espresso">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, href, tone }: { label: string; value: ReactNode; hint?: ReactNode; href?: string; tone?: string }) {
  const body = (
    <>
      <p className="flex items-center gap-2 text-xs text-cocoa">
        {tone && <span className="size-2 rounded-full" style={{ background: tone }} aria-hidden />}
        {label}
      </p>
      <p className="mt-2 font-display text-3xl leading-none tabular-nums text-espresso">{value}</p>
      {hint && <p className="mt-2 text-xs text-cocoa">{hint}</p>}
    </>
  );
  const cls = "block border border-hairline bg-paper px-5 py-4 transition-colors";
  return href ? <Link href={href} className={cn(cls, "hover:border-taupe")}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  if (!isOrderStatus(status)) return <span>{status}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-hairline bg-ivory px-2.5 py-1 text-xs text-espresso">
      <span className="size-1.5 rounded-full" style={{ background: statusTone[status] }} aria-hidden />
      {statusLabel[status]}
    </span>
  );
}

export function PaymentBadge({ status }: { status: string }) {
  const tone = status === "paid" ? "#3f6b4f" : status === "failed" ? "#9b2c2c" : status === "refunded" ? "#6b5d52" : "#b7791f";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-cocoa">
      <span className="size-1.5 rounded-full" style={{ background: tone }} aria-hidden />
      {paymentStatusLabel[status as PaymentStatus] ?? status}
    </span>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <p className="font-display text-2xl">{title}</p>
      {children && <div className="max-w-md text-sm text-cocoa">{children}</div>}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-linen", className)} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-8 h-10 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="mt-6 h-80" />
    </div>
  );
}

const controlCls = "h-10 w-full border border-hairline bg-ivory px-3 text-sm outline-none transition-colors focus:border-espresso aria-[invalid=true]:border-danger";

export function TextInput({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlCls, className)} {...props} />;
}

export function TextArea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlCls, "h-auto py-2", className)} rows={3} {...props} />;
}

export function SelectInput({ className, children, ...props }: ComponentProps<"select">) {
  return <select className={cn(controlCls, "cursor-pointer pr-8", className)} {...props}>{children}</select>;
}

export function FieldRow({ label, hint, error, children, htmlFor, className }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-cocoa">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : hint ? <p className="mt-1 text-xs text-cocoa/80">{hint}</p> : null}
    </div>
  );
}

export function AdminButton({ variant = "solid", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: "solid" | "outline" | "ghost" | "danger"; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 px-3" : "h-10 px-4",
        variant === "solid" && "bg-espresso text-ivory hover:bg-gold-deep",
        variant === "outline" && "border border-hairline bg-paper text-espresso hover:border-espresso",
        variant === "ghost" && "text-espresso hover:bg-linen",
        variant === "danger" && "bg-danger text-ivory hover:bg-danger/90",
        className,
      )}
      {...props}
    />
  );
}

export function AdminLinkButton({ variant = "solid", className, ...props }: ComponentProps<typeof Link> & { variant?: "solid" | "outline" }) {
  return (
    <Link
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap px-4 text-sm font-medium transition-colors",
        variant === "solid" ? "bg-espresso text-ivory hover:bg-gold-deep" : "border border-hairline bg-paper text-espresso hover:border-espresso",
        className,
      )}
      {...props}
    />
  );
}

/** Tables scroll sideways inside their card on small screens instead of breaking the page. */
export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_th]:font-medium [&_th]:text-cocoa [&_thead]:border-b [&_thead]:border-hairline [&_tbody_tr]:border-b [&_tbody_tr]:border-hairline/70 [&_tbody_tr:last-child]:border-0">
        {children}
      </table>
    </div>
  );
}

export function Pagination({ page, pageCount, href }: { page: number; pageCount: number; href: (page: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 border-t border-hairline px-5 py-3 text-sm">
      <span className="text-cocoa">Page {page} of {pageCount}</span>
      <div className="flex gap-2">
        {page > 1 ? <Link href={href(page - 1)} className="border border-hairline px-3 py-1.5 hover:border-espresso">Previous</Link> : null}
        {page < pageCount ? <Link href={href(page + 1)} className="border border-hairline px-3 py-1.5 hover:border-espresso">Next</Link> : null}
      </div>
    </nav>
  );
}

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(iso));

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeZone: "Asia/Karachi" }).format(new Date(iso));
