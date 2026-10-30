import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/format";

type Variant = "solid" | "outline" | "ghost" | "light";
type Size = "md" | "lg" | "sm";

const variants: Record<Variant, string> = {
  solid: "bg-espresso text-ivory hover:bg-gold-deep",
  outline: "border border-espresso text-espresso hover:bg-espresso hover:text-ivory",
  ghost: "text-espresso underline-offset-[6px] hover:underline",
  light: "bg-ivory text-espresso hover:bg-champagne",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-5",
  md: "h-12 px-7",
  lg: "h-14 px-10",
};

export function buttonStyles({ variant = "solid", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "label relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap",
    "transition-[background-color,color,transform] duration-300 ease-luxe active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-50",
    variant !== "ghost" && sizes[size],
    variants[variant],
    className,
  );
}

type Common = { variant?: Variant; size?: Size };

export function Button({ variant, size, className, type = "button", ...props }: ComponentProps<"button"> & Common) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & Common) {
  return <Link className={buttonStyles({ variant, size, className })} {...props} />;
}
