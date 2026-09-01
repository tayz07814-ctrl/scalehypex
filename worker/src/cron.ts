import { createSupabaseClient, type WorkerBindings } from "./supabase"
import { pollAccountForNewVideos, type PollDeps } from "../../lib/pipeline/tiktok-poll"
import {
  refreshAccessToken as ttRefreshAccessToken,
  listVideos as ttListVideos,
} from "../../lib/tiktok/api"
import { logBot } from "./botlog"

/** Rows stuck in `downloading` longer than this are reset to `new` by cron. */
const STUCK_DOWNLOADING_MS = 30 * 60 * 1000

/**
 * Cron entrypoint (every 20 min, see wrangler.jsonc `schedule`).
 * For each connected TikTok account: refresh token if needed, poll video.list,
 * insert new videos (status=new), and — if the owner has auto_publish on —
 * flip them to `downloading` and enqueue a download job.
 */
export async function runCron(env: WorkerBindings, _ctx: ExecutionContext): Promise<void> {
  const supabase = createSupabaseClient(env)
  const credentials = { clientKey: env.TIKTOK_CLIENT_KEY, clientSecret: env.TIKTOK_CLIENT_SECRET }

  // (a0) R2 cleanup sweep: delete objects whose delete_at has passed (1h after publish).
  const nowIso = new Date().toISOString()
  const { data: expiring, error: expErr } = await supabase
    .from("tiktok_videos")
    .select("id, r2_key, user_id")
    .not("delete_at", "is", null)
    .lt("delete_at", nowIso)
  if (expErr) {
    console.error(`cron: load expiring videos failed: ${expErr.message}`)
  } else {
    for (const v of expiring ?? []) {
      if (!v.r2_key) continue
      try {
        await env.VIDEOS.delete(v.r2_key)
        await supabase
          .from("tiktok_videos")
          .update({ r2_key: null, r2_url: null, delete_at: null })
          .eq("id", v.id)
        await supabase.from("bot_logs").insert({
          user_id: v.user_id,
          level: "info",
          message: "R2 video deleted (1h retention)",
          details: { ttVideoId: v.id },
        })
        console.log(`cron: deleted R2 object ${v.r2_key}`)
      } catch (err) {
        console.error(
          `cron: delete R2 ${v.r2_key} failed: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }
  }

  // (a) reset stuck rows: worker died mid-download more than 30 min ago
  const stuckCutoff = new Date(Date.now() - STUCK_DOWNLOADING_MS).toISOString()
  const { error: stuckError } = await supabase
    .from("tiktok_videos")
    .update({ status: "new" })
    .eq("status", "downloading")
    .lt("fetched_at", stuckCutoff)
  if (stuckError) throw new Error(`cron: reset stuck downloads failed: ${stuckError.message}`)

  // (b) all connected TikTok accounts
  const { data: accounts, error: accountsError } = await supabase
    .from("tiktok_accounts")
    .select("*")
  if (accountsError) throw new Error(`cron: load tiktok_accounts failed: ${accountsError.message}`)

  for (const account of accounts ?? []) {
    let added = 0
    try {
      await logBot(supabase, account.user_id, "info", `Polling TikTok video.list for @${account.username ?? "account"}`, {
        account: account.username ?? null,
        ttOpenId: account.tt_open_id,
      })
      // rows actually inserted this pass (uuid row id + TikTok video id)
      const newRows: { rowId: string; ttVideoId: string }[] = []

      const deps: PollDeps = {
        refreshAccessToken: async (refreshToken) => {
          const tokens = await ttRefreshAccessToken(refreshToken, credentials)
          return {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          }
        },
        listVideos: async (accessToken) => {
          const list = await ttListVideos(accessToken)
          return list.videos.map((video) => ({
            id: video.id,
            title: video.title ?? video.video_description ?? null,
            duration: video.duration,
          }))
        },
        updateAccountTokens: async (accountId, accessToken, refreshToken, expiresAt) => {
          const { error } = await supabase
            .from("tiktok_accounts")
            .update({
              access_token: accessToken,
              refresh_token: refreshToken,
              token_expires_at: expiresAt,
            })
            .eq("id", accountId)
          if (error) throw new Error(`update tokens failed: ${error.message}`)
        },
        updateAccountLastVideo: async (accountId, lastVideoId) => {
          const { error } = await supabase
            .from("tiktok_accounts")
            .update({ last_video_id: lastVideoId })
            .eq("id", accountId)
          if (error) throw new Error(`update last_video_id failed: ${error.message}`)
        },
        insertVideos: async (rows) => {
          for (const row of rows) {
            // one-by-one; a unique (account, video_id) violation (23505)
            // means this video was already polled — skip it
            const { data, error } = await supabase
              .from("tiktok_videos")
              .insert({
                tiktok_account_id: row.tiktokAccountId,
                video_id: row.videoId,
                description: row.description,
                download_url: row.downloadUrl,
                cdn_url: row.cdnUrl,
                duration_ms: row.durationMs,
                status: "new",
              })
              .select("id")
            if (error) {
              if (error.code !== "23505") {
                throw new Error(`insert tiktok_videos failed: ${error.message}`)
              }
              continue
            }
            const inserted = (data ?? [])[0]
            if (inserted) newRows.push({ rowId: inserted.id, ttVideoId: row.videoId })
          }
        },
      }

      added = await pollAccountForNewVideos(deps, account)
      await logBot(
        supabase,
        account.user_id,
        added > 0 ? "success" : "info",
        added > 0
          ? `TikTok @${account.username ?? "account"}: ${added} new video(s) detected ${newRows.map((r) => r.ttVideoId).join(", ")}`
          : `TikTok @${account.username ?? "account"}: no new videos (polled ${newRows.length ? 0 : 0} new)`,
        { added, detected: newRows.map((r) => r.ttVideoId) },
      )

      // after insertion: fetch auto_publish setting once for this account
      const { data: settings } = await supabase
        .from("bot_settings")
        .select("auto_publish")
        .eq("user_id", account.user_id)
        .maybeSingle()
      const autoPublish = settings?.auto_publish === true

      // enqueue newly detected videos
      if (newRows.length > 0 && autoPublish) {
        for (const row of newRows) {
          const { error } = await supabase
            .from("tiktok_videos")
            .update({ status: "downloading" })
            .eq("id", row.rowId)
          if (error) throw new Error(`mark downloading failed: ${error.message}`)
          await env.JOBS.send({ type: "download_video", videoId: row.rowId })
          await logBot(supabase, account.user_id, "info", `Enqueued download for video ${row.ttVideoId}`, {
            ttVideoId: row.ttVideoId,
          })
        }
      }

      // Catch-up: rows stuck in non-terminal states (inserted before
      // auto-publish was enabled, or orphaned by a worker crash).
      if (autoPublish) {
        // (i) new rows: inserted but never enqueued
        const { data: pending, error: pendingErr } = await supabase
          .from("tiktok_videos")
          .select("id, video_id")
          .eq("tiktok_account_id", account.id)
          .eq("status", "new")
        if (pendingErr) {
          console.error(`cron: catch-up new select failed: ${pendingErr.message}`)
        } else {
          for (const row of pending ?? []) {
            const { error } = await supabase
              .from("tiktok_videos")
              .update({ status: "downloading" })
              .eq("id", row.id)
            if (error) throw new Error(`catch-up mark downloading failed: ${error.message}`)
            await env.JOBS.send({ type: "download_video", videoId: row.id })
            await logBot(supabase, account.user_id, "info", `Enqueued catch-up download for video ${row.video_id}`, {
              ttVideoId: row.video_id,
            })
          }
        }

        // (ii) ready rows: downloaded but publish never completed (crash)
        const { data: ready, error: readyErr } = await supabase
          .from("tiktok_videos")
          .select("id, video_id")
          .eq("tiktok_account_id", account.id)
          .eq("status", "ready")
        if (readyErr) {
          console.error(`cron: catch-up ready select failed: ${readyErr.message}`)
        } else {
          for (const row of ready ?? []) {
            await env.JOBS.send({ type: "download_video", videoId: row.id })
            await logBot(supabase, account.user_id, "info", `Enqueued publish retry for ready video ${row.video_id}`, {
              ttVideoId: row.video_id,
            })
          }
        }

        // (iii) published rows with failed published_posts (partial failure)
        const { data: published, error: pubErr } = await supabase
          .from("tiktok_videos")
          .select("id, video_id")
          .eq("tiktok_account_id", account.id)
          .eq("status", "published")
        if (pubErr) {
          console.error(`cron: catch-up published select failed: ${pubErr.message}`)
        } else if (published && published.length > 0) {
          const videoIds = published.map((v) => v.id)
          const { data: failedPosts } = await supabase
            .from("published_posts")
            .select("tiktok_video_id")
            .in("tiktok_video_id", videoIds)
            .eq("status", "failed")
          if (failedPosts && failedPosts.length > 0) {
            const uniqueIds = [...new Set(failedPosts.map((p) => p.tiktok_video_id))]
            for (const id of uniqueIds) {
              await env.JOBS.send({ type: "download_video", videoId: id })
              await logBot(supabase, account.user_id, "info", "Enqueued publish retry for partially-failed video", {
                ttVideoId: id,
              })
            }
          }
        }
      }
    } catch (err) {
      // log the account id only — never tokens
      console.error(
        `cron: account ${account.id} failed: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
    // (d) one-line summary per account
    console.log(`cron: account ${account.id} — ${added} new video(s)`)
  }
}
