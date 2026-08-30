-- 0005_profile_pictures.sql
-- Profile pictures for connected accounts (dashboard display).
alter table public.tiktok_accounts add column if not exists avatar_url text;
alter table public.meta_accounts add column if not exists ig_picture_url text;
