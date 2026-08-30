import type { SupabaseClient } from "@supabase/supabase-js"
import {
  createFbPageVideoUpload,
  createFbPageVideoPost,
  createIgReel,
  getFbVideoProcessingStatus,
  getIgMediaStatus,
  publishIgReel,
} from "../../lib/meta/api"
import type { MetaAccountRow, TikTokVideoRow } from "../../lib/pipeline/types"

/**
 * Phase 6: publish a ready video to the user's connected Instagram + Facebook
 * accounts, gated on bot_settings.auto_publish.
 *
 * Fire-and-forget safe: this function NEVER throws — every failure is recorded
 * in published_posts / activity_log instead, so a publish bug can never fail a
 * downloaded row.
 */
export async function publishVideo(
  supabase: SupabaseClient,
  userId: string,
  video: TikTokVideoRow,
  url: string,
): Promise<{ published: number; failed: number }> {
  try {
    return await publishVideoInner(supabase, userId, video, url)
  } catch (err) {
    console.error("publishVideo: unexpected error", err)
    return { published: 0, failed: 1 }
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

interface PollOptions {
  intervalMs: number
  timeoutMs: number
  success: (s: string | undefined) => boolean
  terminal: (s: string | undefined) => boolean
}

/** Poll a status every intervalMs until success/terminal/timeout (max timeoutMs). */
async function pollStatus(
  fetchStatus: () => Promise<string | undefined>,
  opts: PollOptions,
): Promise<{ status: string | undefined; success: boolean }> {
  const deadline = Date.now() + opts.timeoutMs
  let status: string | undefined
  while (Date.now() < deadline) {
    await sleep(opts.intervalMs)
    status = await fetchStatus()
    if (opts.success(status)) return { status, success: true }
    if (opts.terminal(status)) return { status, success: false }
  }
  return { status, success: false }
}

async function insertPublishedPost(
  supabase: SupabaseClient,
  userId: string,
  video: TikTokVideoRow,
  metaAccountId: string,
  platform: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("published_posts")
    .insert({
      user_id: userId,
      tiktok_video_id: video.id,
      meta_account_id: metaAccountId,
      platform,
      status: "pending",
    })
    .select("id")
    .single()
  if (error || !data) return null
  return (data as { id: string }).id
}

async function markFailed(supabase: SupabaseClient, postId: string | null, err: unknown): Promise<void> {
  if (!postId) return
  await supabase
    .from("published_posts")
    .update({ status: "failed", error: errMsg(err).slice(0, 500) })
    .eq("id", postId)
}

async function publishToInstagram(
  supabase: SupabaseClient,
  userId: string,
  video: TikTokVideoRow,
  url: string,
  caption: string,
  igUserId: string,
  pageToken: string,
  metaAccountId: string,
): Promise<boolean> {
  const postId = await insertPublishedPost(supabase, userId, video, metaAccountId, "instagram")
  try {
    const creation = await createIgReel(igUserId, pageToken, url, caption)
    const { status, success } = await pollStatus(
      () => getIgMediaStatus(igUserId, pageToken, creation.id).then((r) => r.status),
      {
        intervalMs: 5_000,
        timeoutMs: 4 * 60 * 1000,
        success: (s) => s === "FINISHED",
        terminal: (s) => s === "ERROR",
      },
    )
    if (!success) throw new Error(`IG reel not finished (status: ${status ?? "timeout"})`)
    await publishIgReel(igUserId, pageToken, creation.id)
    if (postId) {
      await supabase
        .from("published_posts")
        .update({ status: "published", external_post_id: creation.id, published_at: new Date().toISOString() })
        .eq("id", postId)
    }
    return true
  } catch (err) {
    await markFailed(supabase, postId, err)
    return false
  }
}

async function publishToFacebook(
  supabase: SupabaseClient,
  userId: string,
  video: TikTokVideoRow,
  url: string,
  caption: string,
  fbPageId: string,
  pageToken: string,
  metaAccountId: string,
): Promise<boolean> {
  const postId = await insertPublishedPost(supabase, userId, video, metaAccountId, "facebook")
  try {
    const upload = await createFbPageVideoUpload(fbPageId, pageToken, url, caption)
    const { status, success } = await pollStatus(
      () => getFbVideoProcessingStatus(upload.id, pageToken).then((r) => r.processing_info?.status),
      {
        intervalMs: 10_000,
        timeoutMs: 8 * 60 * 1000,
        success: (s) => s === "PUBLISHED",
        terminal: (s) => s === "FAILED" || s === "CANCELED",
      },
    )
    if (!success) throw new Error(`FB video not published (status: ${status ?? "timeout"})`)
    const post = await createFbPageVideoPost(fbPageId, pageToken, upload.id)
    if (postId) {
      await supabase
        .from("published_posts")
        .update({ status: "published", external_post_id: post.id, published_at: new Date().toISOString() })
        .eq("id", postId)
    }
    return true
  } catch (err) {
    await markFailed(supabase, postId, err)
    return false
  }
}

async function publishVideoInner(
  supabase: SupabaseClient,
  userId: string,
  video: TikTokVideoRow,
  url: string,
): Promise<{ published: number; failed: number }> {
  // Gate: only auto-publish when the user opted in (no row => disabled).
  const { data: settings } = await supabase
    .from("bot_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  if (settings?.auto_publish !== true) {
    await supabase.from("activity_log").insert({
      user_id: userId,
      action: "publish_skipped",
      details: { ttVideoId: video.video_id, reason: "auto_publish_disabled" },
    })
    return { published: 0, failed: 0 }
  }

  const caption = (video.description ?? "").trim().slice(0, 2150)

  const { data: accounts } = await supabase
    .from("meta_accounts")
    .select("*")
    .eq("user_id", userId)
  const accountRows = (accounts ?? []) as MetaAccountRow[]

  let published = 0
  let failed = 0

  for (const account of accountRows) {
    const igUserId = account.ig_user_id
    if (igUserId) {
      const ok = await publishToInstagram(
        supabase, userId, video, url, caption, igUserId, account.page_token, account.id,
      )
      if (ok) published++; else failed++
    }
    if (account.fb_page_id) {
      const ok = await publishToFacebook(
        supabase, userId, video, url, caption, account.fb_page_id, account.page_token, account.id,
      )
      if (ok) published++; else failed++
    }
  }

  await supabase.from("activity_log").insert({
    user_id: userId,
    action: "video_published",
    details: { ttVideoId: video.video_id, published, failed },
  })

  // Mark the video row published once at least one platform succeeded —
  // the dashboard Posters/Posts table shows this as the final status.
  if (published > 0) {
    const { error: pubErr } = await supabase
      .from("tiktok_videos")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", video.id)
    if (pubErr) console.error(`publish: mark video published failed: ${pubErr.message}`)
  }
  return { published, failed }
}
