"use client";

import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from "motion/react";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/format";
import { useEscape, useScrollLock } from "@/lib/hooks";
import { motionTokens, springs } from "@/lib/motion/tokens";

type Side = "left" | "right" | "top" | "center";

const panel: Record<Side, string> = {
  left: "inset-y-0 left-0 w-[min(88vw,24rem)]",
  right: "inset-y-0 right-0 w-[min(92vw,28rem)]",
  top: "inset-x-0 top-0 max-h-[90dvh]",
  center: "inset-0 m-auto h-fit max-h-[92dvh] w-[min(94vw,60rem)]",
};

const offscreen: Record<Side, TargetAndTransition> = {
  left: { x: "-100%" },
  right: { x: "100%" },
  top: { y: "-100%" },
  center: { opacity: 0, scale: motionTokens.scale.subtle },
};

/**
 * Accessible modal panel: focus moves in on open and back to the trigger on close,
 * Tab stays inside, Escape and the backdrop close it, and page scroll is locked.
 */
export function Sheet({ open, onClose, side = "right", label, children, className, hideClose = false }: {
  open: boolean;
  onClose: () => void;
  side?: Side;
  label: string;
  children: ReactNode;
  className?: string;
  hideClose?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const close = useCallback(() => onClose(), [onClose]);
  useEscape(open, close);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const target = ref.current?.querySelector<HTMLElement>("[data-autofocus]") ?? ref.current;
      target?.focus();
    }, 50);
    return () => {
      clearTimeout(t);
      trigger?.focus?.();
    };
  }, [open]);

  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !ref.current) return;
    const items = ref.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const hidden = reduce ? { opacity: 0 } : offscreen[side];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-espresso/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.duration.normal }}
            onClick={close}
            aria-hidden
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            onKeyDown={trapTab}
            className={cn("absolute flex flex-col overflow-hidden bg-ivory text-left shadow-lift outline-none", panel[side], className)}
            initial={hidden}
            animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            exit={hidden}
            transition={side === "center" ? { duration: motionTokens.duration.normal, ease: motionTokens.easing.luxe } : springs.gentle}
          >
            {!hideClose && (
              <button
                type="button"
                onClick={close}
                className="absolute right-3 top-3 z-10 grid size-11 place-items-center text-espresso transition-transform duration-300 hover:rotate-90"
                aria-label="Close"
              >
                <X className="size-5" strokeWidth={1.5} />
              </button>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
