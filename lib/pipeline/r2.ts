/**
 * R2 key / public URL helpers (README decision D7).
 * Pure TS (no Next/Node imports) — safe in Cloudflare Workers.
 */

/**
 * R2 key for a downloaded TikTok video: `{userId}/{ttVideoId}/video.mp4`.
 * Always `.mp4` — Meta's Reels API requires the filename to end in .mp4 (D7).
 * Random key = private-by-default (D7).
 */
export function videoR2Key(userId: string, ttVideoId: string): string {
  return `${userId}/${ttVideoId}/video.mp4`
}

/**
 * Public URL for an R2 key: the configured public base (e.g. R2_PUBLIC_BASE)
 * with trailing slashes trimmed, joined to the key.
 */
export function publicR2Url(base: string, key: string): string {
  return `${base.replace(/\/+$/, "")}/${key}`
}
