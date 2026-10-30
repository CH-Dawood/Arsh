import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/format";

const control = "w-full border border-hairline bg-ivory px-4 py-3 text-[0.95rem] outline-none transition-colors placeholder:text-cocoa/50 focus:border-espresso aria-[invalid=true]:border-danger";

type Base = { label: string; error?: string; hint?: string; className?: string };
type FieldProps = Base & (({ multiline: true } & Omit<ComponentProps<"textarea">, "className">) | ({ multiline?: false } & Omit<ComponentProps<"input">, "className">));

/** Labelled input/textarea with inline error and hint, wired up with aria-describedby. */
export function Field({ label, error, hint, className, ...rest }: FieldProps) {
  const { multiline, ...props } = rest;
  const id = useId();
  const describedBy = [error && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  const a11y = { id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy, className: control };

  return (
    <div className={className}>
      <label htmlFor={id} className="label mb-2 block text-cocoa">
        {label}
        {props.required ? <span aria-hidden> *</span> : <span className="ml-1 normal-case tracking-normal">(optional)</span>}
      </label>
      {multiline ? (
        <textarea rows={4} {...(props as ComponentProps<"textarea">)} {...a11y} />
      ) : (
        <input {...(props as ComponentProps<"input">)} {...a11y} />
      )}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs text-cocoa">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function FormMessage({ state }: { state: { ok: boolean; message: string } | null }) {
  if (!state?.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={cn("border px-4 py-3 text-sm", state.ok ? "border-success/40 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger")}>
      {state.message}
    </p>
  );
}
