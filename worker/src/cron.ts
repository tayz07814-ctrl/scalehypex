import { createSupabaseClient, type WorkerBindings } from "./supabase"
import { pollAccountForNewVideos, type PollDeps } from "../../lib/pipeline/tiktok-poll"
import {
  refreshAccessToken as ttRefreshAccessToken,
  listVideos as ttListVideos,
} from "../../lib/tiktok/api"

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
            title: video.title,
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

      // after insertion: if the owner auto-publishes, start downloading now
      if (newRows.length > 0) {
        const { data: settings } = await supabase
          .from("bot_settings")
          .select("auto_publish")
          .eq("user_id", account.user_id)
          .maybeSingle()
        if (settings?.auto_publish === true) {
          for (const row of newRows) {
            const { error } = await supabase
              .from("tiktok_videos")
              .update({ status: "downloading" })
              .eq("id", row.rowId)
            if (error) throw new Error(`mark downloading failed: ${error.message}`)
            await env.JOBS.send({ type: "download_video", videoId: row.rowId })
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
