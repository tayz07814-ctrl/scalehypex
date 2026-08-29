# scalehypex-worker

Cloudflare Worker: cron poll → detect new TikTok videos → queue → yt-dlp container download → R2 upload.

Shared logic lives in `../lib/pipeline` (pure TS). This project must NOT import from `app/` or `lib/supabase/*`.

## Setup

1. `npm install`
2. Create resources (once):
   - Queue: `wrangler queues create scalehypex-jobs` (set max batch size 10 in the dashboard/consumer settings)
   - R2 bucket: `wrangler r2 bucket create scalehypex-videos`
   - yt-dlp image: build + push `../docker/yt-dlp/` (see its Dockerfile), then set `containers[0].image` in `wrangler.jsonc`
3. Fill `vars` in `wrangler.jsonc`: `SUPABASE_URL`, `R2_PUBLIC_BASE`
4. Set secrets (never commit values):
   ```
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   wrangler secret put TIKTOK_CLIENT_KEY
   wrangler secret put TIKTOK_CLIENT_SECRET
   ```
5. Deploy: `npm run deploy` (or `npm run dev` locally). Typecheck: `npm run typecheck`.

## What runs

- `scheduled` (every 20 min) → `src/cron.ts`: resets rows stuck in `downloading` (>30 min), then per TikTok account: refresh token if near expiry, poll `video.list`, insert new videos (`status=new`); if the owner's `bot_settings.auto_publish` is on → `status=downloading` + queue message. Then `runCommentBot` (`src/comments.ts`, Phase 7 stub).
- `queue` (scalehypex-jobs) → `src/consumer.ts`: `{ type: "download_video", videoId }` → yt-dlp container → R2 → `status=ready` + `r2_url` + activity log. IG/FB publish lands here in Phase 6.
