-- 0003_bot_logs.sql
-- ScaleHypex Phase 10: live bot terminal + keyword auto-reply + DM templates.
-- Plain statements, safe to re-run (if not exists guards).

-- bot_logs: append-only stream of what the bot is doing (powers the terminal tab).
create table if not exists public.bot_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete cascade,
  level text not null default 'info',          -- info | success | warn | error
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- reply_rules: keyword -> comment reply + optional DM template.
create table if not exists public.reply_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  keywords text[] not null default '{}',       -- lowercase keywords to match
  comment_reply text not null,                 -- reply posted as a comment
  dm_message text,                             -- optional custom DM to the commenter
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.bot_logs enable row level security;
alter table public.reply_rules enable row level security;

create policy "bot_logs_owner_all" on public.bot_logs
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "reply_rules_owner_all" on public.reply_rules
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- indexes
create index if not exists idx_bot_logs_user_created on public.bot_logs (user_id, created_at desc);
create index if not exists idx_reply_rules_user on public.reply_rules (user_id);
