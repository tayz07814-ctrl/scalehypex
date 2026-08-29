# ScaleHypex

Auto-repost engine for creators: detects new TikTok videos, downloads them watermark-free, and auto-publishes to Instagram Reels + Facebook Pages with the same title/description. Plus a comment auto-reply bot. Reference product: scaledcreator.com.

**STATUS: Phase 8 done — UI polish (landing, dashboard overview, posts, comments, settings). Next: Phase 9 (.env.example complete, deploy Vercel + CF Worker, wire keys/domains). Read this file first, always.**

---

## Mapflow (where everything lives / what to do next)

Legend: `[x]` done · `[~]` in progress · `[ ]` todo

```
C:\scalehypex
├── README.md                  [~] THIS FILE — plan, map, decisions. UPDATE AFTER EVERY STEP.
├── app/                       [x] Next.js app (Vercel)
│   ├── landing/               [x] polished marketing page — lives at app/page.tsx (root)
│   ├── (auth)/                [x] Supabase auth: email+password login/signup (magic link later)
│   ├── dashboard/             [x] overview + posts + comments + settings (header nav on all pages)
│   │   ├── overview/          [x] status cards (videos, published, accounts) + recent activity feed
│   │   ├── posts/             [x] table: video, pipeline status, per-platform status, errors
│   │   ├── comments/          [x] auto-reply log
│   │   └── settings/          [x] toggles: auto-publish, auto-reply, reply template
│   └── api/
│       ├── tiktok/oauth/      [x] GET start (redirect to TikTok) + callback (code->tokens) + POST disconnect
│       └── meta/oauth/        [x] GET start + callback (long-lived token, pages, IG ids)
├── lib/
│   ├── supabase/              [x] clients: browser, server, admin (Next16 async cookies)
│   ├── tiktok/                [x] api.ts: token exchange/refresh, user.info, video.list  (VERIFIED)
│   ├── meta/                  [x] api.ts: reels publish, fb video publish, comments  (VERIFIED)
│   └── pipeline/              [x] types.ts (row types), r2.ts (keys/urls), tiktok-poll.ts (new-video detection) — shared by app + worker (pure TS, no Node APIs)
├── worker/                    [x] Cloudflare Worker (separate wrangler project)
│   ├── src/index.ts           [x] entrypoints: fetch (health), scheduled (cron), queue (consumer)
│   ├── src/cron.ts            [x] every 20 min: reset stuck rows, refresh tokens, poll video.list, enqueue new vids
│   ├── src/consumer.ts        [x] queue: run yt-dlp container -> R2 -> mark ready -> publish IG+FB
│   ├── src/comments.ts        [x] poll comments on our posts, auto-reply (per-run cap)
│   └── src/supabase.ts        [x] service-role client from env bindings (no cookies)
├── supabase/
│   └── migrations/            [x] 0001_schema.sql: all tables below · 0002_video_status.sql: tiktok_videos status/r2/error/duration
├── docker/yt-dlp/             [x] yt-dlp container image (Dockerfile; build -> push -> bind in worker)
└── .env.example               [ ] all envs, filled last (user adds real values at end of dev)
```

**NEXT ACTION: Phase 9 — .env.example complete, deploy Vercel + CF Worker, wire keys/domains.**

---

## Stack (final decisions)

| Piece | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) + Tailwind + shadcn/ui, on Vercel | polished UI fast, user asked Vercel |
| DB/Auth | Supabase (Postgres + Auth) | user asked Supabase |
| Bot/automation | Cloudflare Worker: Cron (20 min) + Queue + Container (yt-dlp) | Vercel can't run yt-dlp binary; CF cron min interval 5 min so 20 min is fine |
| Video storage | Cloudflare R2 | user asked R2; public URL needed by Meta APIs; random keys = private-by-default |
| Download | yt-dlp in CF Container, watermark-free via TikTok CDN | user requirement; yt-dlp keeps up with TikTok changes |

## Data flow

```
CF Cron (*/20 min)
  └─ for each user with TikTok connected:
       1. refresh TikTok tokens if near expiry
       2. GET video.list (TikTok) → newest video id
       3. if id not in tiktok_videos → insert (status=new) + enqueue job
Queue consumer (Worker)
  └─ 4. run yt-dlp container on video url → mp4 (no watermark)
  └─ 5. upload mp4 → R2 → public URL
  └─ 6. publish to each connected target:
         • IG Reels:  POST /{ig_user_id}/media (media_type=REELS, video_url, caption) → creation_id
                      → poll status FINISHED → POST /{ig_user_id}/media_publish
         • FB Page:   POST /{page_id}/videos (file_url, description) → live immediately (implicit publish)
         • if video > 90s → SKIP IG (Reels API cap), still post FB, log warning
  └─ 7. update published_posts (media ids, status, errors)
CF Cron (*/20 min, same trigger, separate module)
  └─ for each published post: GET comments → new ones? → POST reply (template) → mark replied
```

## TikTok (VERIFIED — user research file, Aug 2026)

- **Login Kit OAuth (web)**: redirect `https://www.tiktok.com/v2/auth/authorize/?client_key=..&response_type=code&scope=..&redirect_uri=..&state=..`; callback returns `code`; exchange server-side via User Access Token Management API. Web flow: state CSRF, no PKCE. Redirect URI: https, static, registered in app.
- **Scopes**: `user.info.basic` + `video.list` (read user's public videos ← detection mechanism).
- **Tokens**: access + refresh, store server-side only, refresh before expiry (access ~24h).
- **Rejected**: Data Portability API (3–4 wk approval, batch export, not real-time). Scrape fallback only if `video.list` denied.
- **Implemented (Phase 3)**: `lib/tiktok/api.ts` + `app/api/tiktok/**` follow the section above exactly. No separate research file exists in the repo, so this README section is the single source of truth; endpoints as implemented: `POST /v2/oauth/token/`, `GET /v2/user/info/`, `POST /v2/video/list/` on `open.tiktokapis.com`, authorize on `www.tiktok.com/v2/auth/authorize/`.

## Meta (VERIFIED — Graph API v24.0 deep dive, Aug 2026)

- **Version**: `v24.0` (stable baseline; v26.0 announced 2026-07-29 — keep version in one config const so it's swappable).
- **Scopes** (single FB Login OAuth): `pages_show_list, pages_read_engagement, pages_manage_posts, instagram_content_publish, instagram_manage_comments, business_management`
  - `business_management` is critical: pages/IG linked under a Business Manager are NOT returned without it.
  - Production requires Meta App Review for these advanced perms (dev mode works with app users).
- **After OAuth**: short-lived user token → exchange server-side for **60-day long-lived** → `GET /me/accounts` (pages) → `GET /{page_id}?fields=instagram_business_account` (IG id).
  - Handle gracefully: empty pages list, null IG link, missing `username` field (removed in v24), `OAuthException` code 100.
- **IG Reels** (2-step):
  1. `POST /{ig_user_id}/media` with `media_type=REELS`, `video_url=<public R2>`, `caption` → `creation_id`
  2. poll status until `FINISHED`/`FAILED` → `POST /{ig_user_id}/media_publish` with `creation_id`
  - Constraints: 3–90 s duration, filename MUST end `.mp4` (R2 key = `.../video.mp4`), caption ≤ 2200 chars.
- **FB Page video** (1-step, implicit publish): `POST /{page_id}/videos` with `file_url`, `description` → live immediately.
  - v24.0 has known flaky uploads ("Media upload has failed") → retry with backoff, verify file_url reachable.
- **IG comments**: `GET /{ig_media_id}/comments`; reply `POST /{ig_comment_id}/replies` (body `message`).
- **FB comments**: `GET /{video_id}/comments`; reply `POST /{comment_id}/comments` (body `message`).
  - Privacy: non-fan commenters may have restricted names — never depend on name fields.
  - v26.0 drops comment `id` under Page Public Content Access → dedupe on `(platform, comment_id)` for v24, keep fallback hash (post_id + text + time).
- **Tokens**: user long-lived = 60 days; page tokens derived from it and die with it (revoke/password change) — page tokens NOT independently refreshable → **monthly re-auth prompt** (UI banner + in-app link when < 7 days to expiry).
- **Rate limits** (design around): IG 100 API posts/24h (Reels reportedly 25/24h → cap 25), FB ~4800 calls/24h per page, IG comment replies 750/h per page → exponential backoff on rate errors + per-account daily reply cap (default 50).

## Decision log

- **D1** Detect new videos via official `video.list` polling (20 min), not scraping — confirmed scope exists.
- **D2** yt-dlp runs in a CF Container (Vercel/Supabase can't run the binary). Download step isolated in one module; fallback = resolve watermark-free CDN URL directly in Worker.
- **D3** Meta v24.0; single OAuth with 6 scopes above; 60-day tokens + monthly re-auth prompt (no page-token refresh exists).
- **D4** Videos > 90 s: post to FB only, skip IG (Reels API hard cap), log warning. Optional ffmpeg trim later.
- **D5** Comment dedupe key `(platform, comment_id)` + fallback hash for v26-proofing.
- **D6** Rate guards: backoff on 17/4/32/429 errors; per-account daily reply cap 50 (well under 750/h limit).
- **D7** R2 keys: `{user_id}/{tt_video_id}/video.mp4` — always `.mp4` extension (Meta requirement), random key = private-by-default.
- **D8** Next 16 conventions (from bundled docs): async request APIs only (`await params/cookies/searchParams`), global typed helpers `PageProps<T>`/`LayoutProps<T>`/`RouteContext<T>`, `proxy.ts` replaces `middleware.ts` (nodejs-only runtime — avoid, do session work in route handlers), `typedRoutes` stable.

## DB schema (Supabase Postgres)

```
profiles            (id=auth.users.id, email, created_at)
tiktok_accounts     (user_id, tt_open_id, username, access_token, refresh_token, token_expires_at, last_video_id)
meta_accounts       (user_id, fb_page_id, page_name, ig_user_id, ig_username, page_token, token_expires_at)
tiktok_videos       (id, user_id, tt_video_id unique per user, title, description, create_time, r2_key, r2_url, status: new|downloading|ready|published|failed)
published_posts     (id, user_id, tiktok_video_id, platform: ig|fb, account ref, media_id, caption, status: queued|in_review|live|failed, error, created_at)
replied_comments    (platform, comment_id, post_id, replied_at)  -- dedupe key: (platform, comment_id)
bot_settings        (user_id, auto_post bool, comment_bot bool, reply_template text, updated_at)
activity_log        (user_id, kind, message, meta jsonb, created_at)  -- powers dashboard feed
```

RLS: every table `user_id = auth.uid()`. Worker uses service-role key.

## Phases

1. `[x]` Scaffold: Next.js 16.3.3 + Tailwind v4 + shadcn (button card input label badge table tabs switch avatar separator sonner) + Supabase clients + .env.example — build green
2. `[x]` Migrations: schema + RLS + activity_log
3. `[x]` TikTok OAuth UI + api routes + token storage (video.list verified)
4. `[x]` Worker: cron poll → detect → queue; yt-dlp container → R2
5. `[x]` Meta OAuth + account linking (verified)
6. `[x]` Publish pipeline IG+FB in consumer
7. `[x]` Comment bot IG+FB
8. `[x]` UI polish: landing, dashboard, posts table, settings, logs
9. `[ ]` `.env.example` complete, deploy Vercel + CF Worker, wire domains/webhooks

## Env vars (final phase)

`NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REDIRECT_URI, META_APP_ID, META_APP_SECRET, META_REDIRECT_URI, CF_ACCOUNT_ID, CF_API_TOKEN, R2_BUCKET, R2_PUBLIC_BASE, YTDLP_IMAGE`

## Risks / notes

- Platform ToS: automated cross-posting + comment automation is gray-zone (scaledcreator does it anyway). Keep reply templates simple, rate-limit replies (D6).
- CF Containers: confirm availability at deploy; fallback per D2.
- IG Reels needs public video URL → R2 public bucket or long-lived signed URL.
- Keep worker + app logic in shared `lib/pipeline` (pure TS) so both can use it.
- Meta v24.0 is flaky on video uploads by community reports → retries + clear error surfacing in dashboard.
