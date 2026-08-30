-- 0006_reply_rules_upgrade.sql
-- Richer auto-reply rules: match mode, platform targeting, priority, DM toggle.
alter table public.reply_rules add column if not exists match_mode text not null default 'contains';
alter table public.reply_rules add column if not exists platform text not null default 'all';
alter table public.reply_rules add column if not exists priority integer not null default 0;
alter table public.reply_rules add column if not exists dm_enabled boolean not null default true;
