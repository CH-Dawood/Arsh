import { z } from "zod";

/** Accepts 03XXXXXXXXX, +92 3XX XXXXXXX, 923XXXXXXXXX; normalises to 03XXXXXXXXX (same rule as the database). */
export const pkPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^\d]/g, ""))
  .transform((d) => (d.startsWith("92") ? `0${d.slice(2)}` : d.startsWith("3") ? `0${d}` : d))
  .pipe(z.string().regex(/^03\d{9}$/, "Enter a valid Pakistani mobile number, e.g. 0300 1234567."));

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);

export const checkoutSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name.").max(120),
  phone: pkPhone,
  email: z.union([z.literal(""), z.email("Enter a valid email address.").max(254)]).optional().transform((v) => v || undefined),
  city: z.string().trim().min(2, "Please enter your city.").max(80),
  address_line: z.string().trim().min(10, "Please enter your complete address (house, street, area).").max(300),
  postal_code: z.union([z.literal(""), z.string().regex(/^\d{5}$/, "Postal code is 5 digits.")]).optional().transform((v) => v || undefined),
  notes: optionalText(500),
  payment_method: z.enum(["cod", "bank_transfer", "easypaisa", "jazzcash", "card"]),
  coupon: optionalText(30),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;

export const cartItemsSchema = z
  .array(z.object({ variant_id: z.string().min(1).max(80), quantity: z.number().int().min(1).max(10) }))
  .min(1, "Your bag is empty.")
  .max(50);

export const trackSchema = z.object({
  order_number: z.string().trim().toUpperCase().regex(/^ORD-\d{6}-[0-9A-F]{6}$/, "Order numbers look like ORD-261030-A1B2C3."),
  phone: pkPhone,
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.email("Enter a valid email address.").max(254),
  phone: optionalText(30),
  subject: optionalText(150),
  message: z.string().trim().min(10, "Please write a little more (at least 10 characters).").max(3000),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.").max(128),
});

export const registerSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.email("Enter a valid email address.").max(254),
  password: z
    .string()
    .min(10, "Use at least 10 characters.")
    .max(128)
    .regex(/[a-z]/, "Include a lowercase letter.")
    .regex(/[A-Z]/, "Include an uppercase letter.")
    .regex(/\d/, "Include a number."),
});

/** Flattens Zod issues into { field: firstMessage } for inline form errors. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
