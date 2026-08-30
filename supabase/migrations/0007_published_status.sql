-- 0007_published_status.sql
-- Track when a tiktok_video finished publishing (dashboard Published badge).
alter table public.tiktok_videos add column if not exists published_at timestamptz;
