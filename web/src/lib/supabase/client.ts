import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";

export const createClient = () => createBrowserClient<Database>(env.supabaseUrl, env.supabaseKey);
