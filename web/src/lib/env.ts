import { z } from "zod";

// Public values are inlined at build time, so each must be referenced literally.
const parsed = z
  .object({
    NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
    NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20).optional(),
  })
  .parse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
  });

export const env = {
  siteUrl: parsed.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ""),
  supabaseUrl: parsed.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey: parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
};

/** False until Supabase credentials are set; the storefront then runs on the demo catalogue. */
export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseKey);
