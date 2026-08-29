-- 0002_video_status.sql
-- ScaleHypex Phase 4: pipeline status tracking for tiktok_videos.
-- Plain statements, safe to re-run (if not exists guards).

-- tiktok_videos: pipeline status (new | downloading | ready | failed),
-- R2 download location, last error, and duration in milliseconds.
alter table public.tiktok_videos add column if not exists status text not null default 'new';
alter table public.tiktok_videos add column if not exists r2_key text;
alter table public.tiktok_videos add column if not exists r2_url text;
alter table public.tiktok_videos add column if not exists error text;
alter table public.tiktok_videos add column if not exists duration_ms integer;

-- indexes

create index if not exists idx_tiktok_videos_status on public.tiktok_videos (status);
