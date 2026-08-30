-- 0008_metrics.sql
-- Per-published-post performance metrics (filled by the worker's metrics collector).
alter table public.published_posts add column if not exists views bigint;
alter table public.published_posts add column if not exists likes bigint;
alter table public.published_posts add column if not exists comments_count bigint;
alter table public.published_posts add column if not exists saves bigint;
alter table public.published_posts add column if not exists shares bigint;
alter table public.published_posts add column if not exists permalink text;
alter table public.published_posts add column if not exists metrics_captured_at timestamptz;
