import { createBrowserClient } from "@supabase/ssr";

/** Client-side Supabase client (client components). */
export function createBrowserSupabaseClient() {
  // persistSession + autoRefreshToken keep the user signed in across visits
  // in the same browser (session lives in cookies, tokens auto-renew).
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}
