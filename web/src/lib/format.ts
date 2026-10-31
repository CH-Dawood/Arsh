import { clsx, type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

const pkr = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });

/** Prices are whole rupees. */
export const formatPKR = (amount: number) => `PKR ${pkr.format(amount)}`;

/** Short axis/tile form: PKR 950, PKR 12.5k, PKR 1.2M. */
export const formatPKRCompact = (amount: number) =>
  `PKR ${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(amount)}`;

export const discountPercent = (price: number, compareAt: number | null) =>
  compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0;

/** wa.me links need the international number with digits only, e.g. 923001234567. */
export const whatsappLink = (number: string, message?: string | null) =>
  `https://wa.me/${number.replace(/\D/g, "")}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
