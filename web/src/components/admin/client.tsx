"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/format";
import { useToasts } from "@/lib/admin/toast";
import { AdminButton } from "./ui";

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:w-96" aria-live="polite" role="status">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 24 }}
            className={cn(
              "pointer-events-auto flex w-full items-start gap-3 border bg-paper px-4 py-3 text-sm shadow-lift",
              t.kind === "error" ? "border-danger/40" : t.kind === "success" ? "border-success/40" : "border-hairline",
            )}
          >
            {t.kind === "error" ? <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
              : t.kind === "success" ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              : <Info className="mt-0.5 size-4 shrink-0 text-cocoa" aria-hidden />}
            <p className="flex-1">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-cocoa hover:text-espresso">
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Confirmation step for destructive or important actions. */
export function ConfirmDialog({ open, title, children, confirmLabel = "Confirm", destructive = false, pending = false, onConfirm, onCancel }: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet open={open} onClose={onCancel} side="center" label={title} className="w-[min(94vw,28rem)]">
      <div className="p-6 pt-8">
        <h2 className="text-2xl">{title}</h2>
        {children && <div className="mt-3 text-sm text-cocoa">{children}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <AdminButton variant="outline" onClick={onCancel} disabled={pending} data-autofocus>Cancel</AdminButton>
          <AdminButton variant={destructive ? "danger" : "solid"} onClick={onConfirm} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </AdminButton>
        </div>
      </div>
    </Sheet>
  );
}

export function Toggle({ checked, onChange, label, description, disabled, name }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4", disabled && "cursor-not-allowed opacity-60")}>
      <span>
        <span className="block text-sm text-espresso">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-cocoa">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" name={name} className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-taupe/60 transition-colors peer-checked:bg-espresso peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-deep" />
        <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-paper shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function useConfirm() {
  const [state, setState] = useState<{ open: boolean; payload?: unknown }>({ open: false });
  return {
    open: state.open,
    payload: state.payload,
    ask: (payload?: unknown) => setState({ open: true, payload }),
    close: () => setState({ open: false }),
  };
}
