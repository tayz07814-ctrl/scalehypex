import type { SupabaseClient } from "@supabase/supabase-js"
import { createSupabaseClient, type WorkerBindings } from "./supabase"
import { publicR2Url, videoR2Key } from "../../lib/pipeline/r2"
import type { TikTokVideoRow } from "../../lib/pipeline/types"
import { publishVideo } from "./publish"
import { logBot } from "./botlog"

/** Queue message shape (produced by cron.ts). */
export interface DownloadVideoJob {
  type: "download_video"
  videoId: string // tiktok_videos.id (uuid)
}

/** How long a published video stays in R2 before deletion (1 hour). */
export const R2_RETENTION_MS = 60 * 60 * 1000

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

/**
 * Fetch the mp4 bytes from a TikTok CDN URL with browser-like headers and
 * retries (TikTok CDN can 403 or throttle without them).
 */
async function fetchCdnBytes(url: string): Promise<ArrayBuffer> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Referer: "https://www.tiktok.com/",
          Accept: "video/mp4,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(120_000),
      })
      if (!res.ok) throw new Error(`CDN HTTP ${res.status}`)
      const buf = await res.arrayBuffer()
      if (buf.byteLength === 0) throw new Error("CDN returned empty body")
      return buf
    } catch (err) {
      lastErr = err
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1500 * attempt))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("CDN fetch failed")
}

/**
 * Queue consumer (scalehypex-jobs): fetch the video from TikTok CDN (no
 * watermark), upload to R2, publish to IG/FB, then schedule R2 deletion 1h
 * after successful publish.
 */
export async function consume(
  batch: MessageBatch<DownloadVideoJob>,
  env: WorkerBindings,
): Promise<void> {
  const supabase = createSupabaseClient(env)
  for (const message of batch.messages) {
    const job = message.body
    if (!job || job.type !== "download_video" || typeof job.videoId !== "string") {
      console.error(`consumer: skipping unknown message ${message.id}`)
      continue
    }
    try {
      await processDownloadJob(supabase, env, job.videoId)
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      console.error(`consumer: video ${job.videoId} failed: ${detail}`)
      await failRow(supabase, job.videoId, detail)
    }
  }
  await batch.ackAll()
}

async function processDownloadJob(
  supabase: SupabaseClient,
  env: WorkerBindings,
  videoId: string,
): Promise<void> {
  // 1. load the row + its account (for user_id); skip if missing
  const { data: row } = await supabase
    .from("tiktok_videos")
    .select("*")
    .eq("id", videoId)
    .maybeSingle()
  if (!row) {
    console.warn(`consumer: video ${videoId} not found — skipping`)
    return
  }
  const video = row as TikTokVideoRow
  const { data: account } = await supabase
    .from("tiktok_accounts")
    .select("user_id")
    .eq("id", video.tiktok_account_id)
    .maybeSingle()
  if (!account) {
    await failRow(supabase, videoId, "tiktok account missing for video row")
    return
  }
  const userId = (account as { user_id: string }).user_id

  // 2. source URL: prefer the resolved CDN url (cdn_url), else download_url
  const sourceUrl = video.cdn_url ?? video.download_url
  if (!sourceUrl) {
    await failRow(supabase, videoId, "video row has no CDN/download URL")
    return
  }

  await logBot(supabase, userId, "info", "Fetching video from TikTok CDN", {
    ttVideoId: video.video_id,
  })

  // 3. fetch the mp4 bytes (browser headers + retries)
  const bytes = await fetchCdnBytes(sourceUrl)

  // 4. upload to R2
  const key = videoR2Key(userId, video.video_id)
  await env.VIDEOS.put(key, bytes, { httpMetadata: { contentType: "video/mp4" } })

  // 5. mark ready with the public URL
  const url = publicR2Url(env.R2_PUBLIC_BASE, key)
  const { error } = await supabase
    .from("tiktok_videos")
    .update({ status: "ready", r2_key: key, r2_url: url })
    .eq("id", videoId)
  if (error) throw new Error(`mark ready failed: ${error.message}`)

  await logBot(supabase, userId, "success", "Video downloaded to R2", {
    ttVideoId: video.video_id,
  })

  // 6. activity log (powers the dashboard feed)
  const { error: logError } = await supabase.from("activity_log").insert({
    user_id: userId,
    action: "video_downloaded",
    details: { ttVideoId: video.video_id },
  })
  if (logError) throw new Error(`activity_log insert failed: ${logError.message}`)

  // 7. Phase 6: auto-publish to IG/FB (row is ready + public URL set).
  //    publishVideo returns { published, failed } counts.
  const result = await publishVideo(supabase, userId, video, url)

  // 8. Schedule R2 deletion 1 hour after successful publish.
  //    Meta's IG/FB APIs fetch the public R2 URL during processing, so we
  //    only delete after publish completes. We store a delete_at timestamp
  //    and let the cron sweep it (see cron.ts) — robust against worker restarts.
  if (result.published > 0) {
    const deleteAt = new Date(Date.now() + R2_RETENTION_MS).toISOString()
    const { error: delErr } = await supabase
      .from("tiktok_videos")
      .update({ delete_at: deleteAt })
      .eq("id", videoId)
    if (delErr) console.error(`consumer: schedule delete failed: ${delErr.message}`)
    await logBot(supabase, userId, "info", "Video published — R2 cleanup scheduled in 1h", {
      ttVideoId: video.video_id,
      published: result.published,
      failed: result.failed,
    })
  } else {
    await logBot(supabase, userId, "warn", "Publish skipped or failed — keeping R2 copy", {
      ttVideoId: video.video_id,
      published: result.published,
      failed: result.failed,
    })
  }
}

async function failRow(supabase: SupabaseClient, videoId: string, error: string): Promise<void> {
  const { error: updateError } = await supabase
    .from("tiktok_videos")
    .update({ status: "failed", error: error.slice(-500) })
    .eq("id", videoId)
  if (updateError) {
    console.error(`consumer: failed to mark ${videoId} failed: ${updateError.message}`)
  }
}
