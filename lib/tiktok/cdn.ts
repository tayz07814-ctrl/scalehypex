/**
 * Watermark-free TikTok video URL resolution.
 *
 * Strategy (per user decision):
 *   1. Try the TikTok v1 API (`/v1/video/data/`) which returns `video.play_addr`
 *      (the no-watermark CDN variant) for the authorized user's own videos.
 *   2. Fall back to scraping the video page HTML for the `playAddr` JSON blob
 *      (the same URL the web player uses — no watermark).
 *
 * Pure TS + fetch, worker-portable (no Node builtins).
 */

const TIKTOK_BASE_URL = "https://open.tiktokapis.com"
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

export interface ResolvedVideoUrl {
  /** The watermark-free mp4 CDN URL (playAddr). */
  url: string
  /** Which strategy produced it. */
  source: "v1_api" | "scrape"
}

/** Pick the best (largest, non-watermarked) URL from a TikTok `url_list`. */
function pickBestUrl(urlList: string[] | undefined): string | undefined {
  if (!urlList || urlList.length === 0) return undefined
  // Prefer https, then the longest (usually highest quality). Skip watermarked
  // variants if present (they contain "wm" in the path).
  const https = urlList.filter((u) => u.startsWith("https://"))
  const pool = https.length > 0 ? https : urlList
  const clean = pool.filter((u) => !/\/wm\//i.test(u))
  const best = (clean.length > 0 ? clean : pool).sort((a, b) => b.length - a.length)[0]
  return best
}

/**
 * Strategy 1: TikTok v1 API — returns `video.play_addr.url_list` (no watermark)
 * for the authorized user's own videos.
 */
export async function resolveViaV1Api(
  accessToken: string,
  videoId: string,
): Promise<ResolvedVideoUrl | null> {
  try {
    const res = await fetch(
      `${TIKTOK_BASE_URL}/v1/video/data/?fields=video.play_addr&video_ids=${videoId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!res.ok) return null
    const body = (await res.json()) as {
      data?: { videos?: { video?: { play_addr?: { url_list?: string[] } } }[] }
    }
    const video = body.data?.videos?.[0]?.video
    const url = pickBestUrl(video?.play_addr?.url_list)
    return url ? { url, source: "v1_api" } : null
  } catch {
    return null
  }
}

/**
 * Strategy 2: scrape the video page HTML for the `playAddr` (no watermark).
 * The web player uses this URL, so it's the clean variant.
 */
export async function resolveViaScrape(videoId: string): Promise<ResolvedVideoUrl | null> {
  try {
    const pageUrl = `https://www.tiktok.com/@_/video/${videoId}`
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent": UA,
        Referer: "https://www.tiktok.com/",
        Accept: "text/html,application/xhtml+xml",
      },
    })
    if (!res.ok) return null
    const html = await res.text()

    // The page embeds a JSON blob with `playAddr` (and `playAddrWm`).
    // Find the first `playAddr":"https://...` occurrence (clean variant).
    const cleanRe = /"playAddr"\s*:\s*"([^"]+)"/g
    let best: string | null = null
    let m: RegExpExecArray | null
    while ((m = cleanRe.exec(html)) !== null) {
      const candidate = m[1].replace(/\u002F/g, "/").split("\/").join("/")
      if (!/\/wm\//i.test(candidate)) {
        best = candidate
        break
      }
    }
    if (!best) {
      // fallback: any playAddr
      const any = /"playAddr"\s*:\s*"([^"]+)"/.exec(html)
      if (any) best = any[1].replace(/\u002F/g, "/").split("\/").join("/")
    }
    return best ? { url: best, source: "scrape" } : null
  } catch {
    return null
  }
}

/**
 * Resolve a watermark-free mp4 URL for a video: v1 API first, scrape fallback.
 * Returns null if both fail.
 */
export async function resolveWatermarkFreeUrl(
  accessToken: string,
  videoId: string,
): Promise<ResolvedVideoUrl | null> {
  const viaApi = await resolveViaV1Api(accessToken, videoId)
  if (viaApi) return viaApi
  return resolveViaScrape(videoId)
}
