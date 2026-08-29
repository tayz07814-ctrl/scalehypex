import type { SupabaseClient } from "@supabase/supabase-js"
import { createSupabaseClient, type WorkerBindings } from "./supabase"
import { publicR2Url, videoR2Key } from "../../lib/pipeline/r2"
import type { TikTokVideoRow } from "../../lib/pipeline/types"
import { publishVideo } from "./publish"

/** Queue message shape (produced by cron.ts). */
export interface DownloadVideoJob {
  type: "download_video"
  videoId: string // tiktok_videos.id (uuid)
}

/**
 * Queue consumer (scalehypex-jobs): download the video via the yt-dlp
 * container, upload to R2, mark the row ready.
 * Failures are terminal per row (status=failed + error), then the batch acks.
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
  if (!video.download_url) {
    await failRow(supabase, videoId, "video row has no download_url")
    return
  }

  // 2. download via the yt-dlp container (image entrypoint is `yt-dlp`).
  //    `-o -` streams the raw mp4 to stdout — the typed Container API
  //    (this wrangler version) has no temp-file read method, so stdout is
  //    the transport. yt-dlp's own logs go to stderr.
  const proc = await env.YTDLP.exec(
    ["-f", "best", "-o", "-", "--no-playlist", "--force-overwrites", video.download_url],
    { signal: AbortSignal.timeout(120_000) },
  )
  const output = await proc.output()
  if (output.exitCode !== 0) {
    await failRow(supabase, videoId, new TextDecoder().decode(output.stderr).slice(-500))
    return
  }

  // 3. mp4 bytes came back on stdout
  const bytes = output.stdout
  if (bytes.byteLength === 0) {
    await failRow(supabase, videoId, "yt-dlp produced no output on stdout")
    return
  }

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

  // 6. activity log (powers the dashboard feed)
  const { error: logError } = await supabase.from("activity_log").insert({
    user_id: userId,
    action: "video_downloaded",
    details: { ttVideoId: video.video_id },
  })
  if (logError) throw new Error(`activity_log insert failed: ${logError.message}`)

  // 7. Phase 6: auto-publish to IG/FB (row is ready + public URL set).
  //    Never let a publish bug fail an already-downloaded row.
  try {
    await publishVideo(supabase, userId, video, url)
  } catch (err) {
    console.error(
      `consumer: publish failed for ${videoId}: ${err instanceof Error ? err.message : String(err)}`,
    )
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
