import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Worker bindings (wrangler.jsonc vars + secrets + resource bindings).
 * Secrets are set via `wrangler secret put` — never commit them:
 *   SUPABASE_SERVICE_ROLE_KEY, TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
 */
export interface WorkerBindings {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  TIKTOK_CLIENT_KEY: string
  TIKTOK_CLIENT_SECRET: string
  R2_PUBLIC_BASE: string
  /** Queue producer: scalehypex-jobs */
  JOBS: Queue
  /** R2 bucket: scalehypex-videos */
  VIDEOS: R2Bucket
  /** CF Container whose image entrypoint is `yt-dlp` (optional until the container is deployed) */
  YTDLP?: Container
}

/**
 * Service-role Supabase client (bypasses RLS). Mirrors lib/supabase/admin.ts,
 * but reads from Worker env bindings instead of process.env — no cookies.
 */
export function createSupabaseClient(env: WorkerBindings): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
