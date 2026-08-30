/**
 * New-video detection for connected TikTok accounts (README data flow, steps 1-3).
 *
 * Pure TS — no Next/Node imports, no DB or HTTP clients. Everything external
 * (token refresh, video.list, DB writes) comes in via `PollDeps`, so this is
 * unit-testable and shared between the Next.js app and the Cloudflare Worker.
 *
 * Failures (e.g. TikTokApiError from the TikTok API) are left to throw — the
 * caller catches per-account and records the error on the account/row.
 */

import type { TikTokAccountRow } from "./types"

export interface PollDeps {
  refreshAccessToken: (refreshToken: string) => Promise<{ accessToken: string; refreshToken: string; expiresAt: string }>
  listVideos: (accessToken: string) => Promise<{ id: string; title: string | null; duration: number; cdnUrl?: string | null }[]> // newest-first
  updateAccountTokens: (accountId: string, accessToken: string, refreshToken: string, expiresAt: string) => Promise<void>
  updateAccountLastVideo: (accountId: string, lastVideoId: string) => Promise<void>
  insertVideos: (rows: {
    tiktokAccountId: string
    videoId: string
    description: string | null
    downloadUrl: string | null
    cdnUrl: string | null
    durationMs: number | null
  }[]) => Promise<void>
}

/** Account fields the poller needs (subset of TikTokAccountRow). */
export type PollAccount = Pick<
  TikTokAccountRow,
  "id" | "username" | "access_token" | "refresh_token" | "token_expires_at" | "last_video_id"
>

/** Public TikTok page URL for a video (the URL yt-dlp downloads from). */
export function videoPageUrl(username: string | null, videoId: string): string {
  return username
    ? `https://www.tiktok.com/@${username}/video/${videoId}`
    : `https://www.tiktok.com/video/${videoId}`
}

/** Refresh window: refresh the access token within 1 hour of expiry. */
const REFRESH_WINDOW_MS = 60 * 60 * 1000

function tokenNeedsRefresh(tokenExpiresAt: string | null, nowMs: number): boolean {
  if (tokenExpiresAt === null) return true // unknown expiry -> refresh to be safe
  const expiresAtMs = Date.parse(tokenExpiresAt)
  if (Number.isNaN(expiresAtMs)) return true // unparseable -> refresh to be safe
  return expiresAtMs - nowMs <= REFRESH_WINDOW_MS
}

/**
 * Poll one account for new videos and insert them.
 * Returns the number of videos handed to `insertVideos`.
 *
 * (a) refresh the access token if expired or expiring within 1 hour
 * (b) list videos, newest-first
 * (c) first connect (last_video_id null): take ONLY the single newest video
 * (d) otherwise: take videos from the front of the list until last_video_id
 *     (exclusive) — if last_video_id is not on the page, take the whole page
 * (e) build rows (description = title, download_url = page URL, ms duration)
 * (f) insertVideos (caller handles unique-violation dedupe), then advance
 *     the account's last_video_id to the newest video
 */
export async function pollAccountForNewVideos(deps: PollDeps, account: PollAccount): Promise<number> {
  // (a) token refresh
  let accessToken = account.access_token
  if (tokenNeedsRefresh(account.token_expires_at, Date.now())) {
    const tokens = await deps.refreshAccessToken(account.refresh_token)
    await deps.updateAccountTokens(account.id, tokens.accessToken, tokens.refreshToken, tokens.expiresAt)
    accessToken = tokens.accessToken
  }

  // (b) newest-first video list
  const videos = await deps.listVideos(accessToken)
  if (videos.length === 0) return 0

  // (c) + (d) select the new videos
  const newVideos: { id: string; title: string | null; duration: number; cdnUrl?: string | null }[] = []
  if (account.last_video_id === null) {
    newVideos.push(videos[0]) // only the newest one — no first-connect backfill
  } else {
    for (const video of videos) {
      if (video.id === account.last_video_id) break // cursor hit -> stop (exclusive)
      newVideos.push(video)
    }
  }
  if (newVideos.length === 0) return 0

  // (e) build rows
  const rows = newVideos.map((video) => ({
    tiktokAccountId: account.id,
    videoId: video.id,
    description: video.title,
    downloadUrl: video.cdnUrl ?? videoPageUrl(account.username, video.id),
    cdnUrl: video.cdnUrl ?? null,
    durationMs: video.duration * 1000,
  }))

  // (f) insert (caller dedupes on unique violation), then advance the cursor
  await deps.insertVideos(rows)
  await deps.updateAccountLastVideo(account.id, newVideos[0].id)

  return rows.length
}
