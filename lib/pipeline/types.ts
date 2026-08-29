/**
 * Row types for the Supabase Postgres tables (public schema).
 *
 * Source of truth: supabase/migrations/0001_schema.sql + 0002_video_status.sql.
 * Pure TS — no Next/Node imports; shared by the Next.js app and the
 * Cloudflare Worker (which imports lib/pipeline via relative paths).
 *
 * Column -> TS mapping:
 *   uuid         -> string
 *   text         -> string (| null when the column is nullable)
 *   timestamptz  -> string (ISO 8601)
 *   boolean      -> boolean
 *   integer      -> number
 */

/** tiktok_accounts */
export interface TikTokAccountRow {
  id: string
  user_id: string
  tt_open_id: string
  username: string | null
  access_token: string
  refresh_token: string
  token_expires_at: string | null
  last_video_id: string | null
  created_at: string
}

/** tiktok_videos.status (see 0002_video_status.sql) */
export type TikTokVideoStatus = "new" | "downloading" | "ready" | "failed"

/** tiktok_videos */
export interface TikTokVideoRow {
  id: string
  tiktok_account_id: string
  video_id: string
  description: string | null
  download_url: string | null
  fetched_at: string
  status: TikTokVideoStatus
  r2_key: string | null
  r2_url: string | null
  error: string | null
  duration_ms: number | null
}

/** published_posts (platform is 'ig' | 'fb' in practice; plain text in the DB) */
export interface PublishedPostRow {
  id: string
  user_id: string
  tiktok_video_id: string | null
  meta_account_id: string | null
  platform: string
  external_post_id: string | null
  status: string
  error: string | null
  published_at: string | null
  created_at: string
}

/** meta_accounts */
export interface MetaAccountRow {
  id: string
  user_id: string
  fb_page_id: string
  page_name: string | null
  ig_user_id: string | null
  ig_username: string | null
  page_token: string
  ig_token: string | null
  created_at: string
}

/** bot_settings */
export interface BotSettingsRow {
  user_id: string
  auto_publish: boolean
  auto_reply: boolean
  reply_template: string | null
  updated_at: string
}
