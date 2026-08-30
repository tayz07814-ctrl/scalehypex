-- 0004_cdn_delete.sql
-- Phase 10: direct CDN download URL + R2 deletion timestamp (1h after publish).
alter table public.tiktok_videos add column if not exists cdn_url text;
alter table public.tiktok_videos add column if not exists delete_at timestamptz;
