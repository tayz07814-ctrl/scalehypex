import { createClient } from "@supabase/supabase-js";

/**
 * Admin client — bypasses RLS. SERVER ONLY (service role key).
 * Used by cron-triggered route handlers / worker-side operations.
 */
export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
