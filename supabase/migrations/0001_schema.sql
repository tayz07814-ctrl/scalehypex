-- 0001_schema.sql
-- ScaleHypex Phase 2: base schema (public schema).
-- Plain statements, intended to run once on a fresh Supabase project.
-- No extensions needed: gen_random_uuid() is built in to Postgres 13+
-- (Supabase runs 15+), so no pgcrypto dependency.

-- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- tiktok_accounts
create table public.tiktok_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tt_open_id text not null,
  username text,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz,
  last_video_id text,
  created_at timestamptz not null default now(),
  unique (user_id, tt_open_id)
);

-- meta_accounts
create table public.meta_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  fb_page_id text not null,
  page_name text,
  ig_user_id text,
  ig_username text,
  page_token text not null,
  ig_token text,
  created_at timestamptz not null default now(),
  unique (user_id, fb_page_id)
);

-- tiktok_videos
create table public.tiktok_videos (
  id uuid primary key default gen_random_uuid(),
  tiktok_account_id uuid not null references public.tiktok_accounts (id) on delete cascade,
  video_id text not null,
  description text,
  download_url text,
  fetched_at timestamptz not null default now(),
  unique (tiktok_account_id, video_id)
);

-- published_posts
create table public.published_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tiktok_video_id uuid references public.tiktok_videos (id) on delete set null,
  meta_account_id uuid references public.meta_accounts (id) on delete set null,
  platform text not null,
  external_post_id text,
  status text not null default 'pending',
  error text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- replied_comments
create table public.replied_comments (
  id uuid primary key default gen_random_uuid(),
  meta_account_id uuid not null references public.meta_accounts (id) on delete cascade,
  platform text not null,
  external_comment_id text not null,
  external_reply_id text,
  reply_text text,
  created_at timestamptz not null default now(),
  unique (meta_account_id, platform, external_comment_id)
);

-- bot_settings
create table public.bot_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  auto_publish boolean not null default false,
  auto_reply boolean not null default false,
  reply_template text,
  updated_at timestamptz not null default now()
);

-- activity_log
create table public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.tiktok_accounts enable row level security;
alter table public.meta_accounts enable row level security;
alter table public.tiktok_videos enable row level security;
alter table public.published_posts enable row level security;
alter table public.replied_comments enable row level security;
alter table public.bot_settings enable row level security;
alter table public.activity_log enable row level security;

-- profiles: owner is the row itself (id = auth.users.id)
create policy "profiles_owner_all" on public.profiles
for all
using (id = auth.uid())
with check (id = auth.uid());

create policy "tiktok_accounts_owner_all" on public.tiktok_accounts
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "meta_accounts_owner_all" on public.meta_accounts
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- tiktok_videos has no user_id column: resolve ownership via tiktok_accounts
create policy "tiktok_videos_owner_all" on public.tiktok_videos
for all
using (tiktok_account_id in (select id from public.tiktok_accounts where user_id = auth.uid()))
with check (tiktok_account_id in (select id from public.tiktok_accounts where user_id = auth.uid()));

create policy "published_posts_owner_all" on public.published_posts
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- replied_comments has no user_id column: resolve ownership via meta_accounts
create policy "replied_comments_owner_all" on public.replied_comments
for all
using (meta_account_id in (select id from public.meta_accounts where user_id = auth.uid()))
with check (meta_account_id in (select id from public.meta_accounts where user_id = auth.uid()));

create policy "bot_settings_owner_all" on public.bot_settings
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "activity_log_owner_all" on public.activity_log
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- triggers

-- NOTE: the trigger below requires this migration to run in a Supabase project
-- where auth.users is accessible (standard Supabase Postgres). It mirrors new
-- auth.users rows into profiles so profile data exists before the app writes it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- keeps bot_settings.updated_at current on every update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_bot_settings_updated_at
before update on public.bot_settings
for each row
execute function public.set_updated_at();

-- indexes

create index idx_tiktok_videos_account_fetched on public.tiktok_videos (tiktok_account_id, fetched_at desc);
create index idx_published_posts_user_created on public.published_posts (user_id, created_at desc);
create index idx_replied_comments_account_created on public.replied_comments (meta_account_id, created_at desc);
create index idx_activity_log_user_created on public.activity_log (user_id, created_at desc);
