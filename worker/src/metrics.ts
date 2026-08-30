import { getFbVideoMetrics, getIgMediaMetrics } from "../../lib/meta/api"
import { createSupabaseClient, type WorkerBindings } from "./supabase"
import { logBot } from "./botlog"

/** Re-collect a post's metrics at most once every 6 hours. */
const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000
/** Max posts per account per run (Graph API rate-limit hygiene). */
const MAX_POSTS_PER_ACCOUNT = 40

type MetricsPost = {
  id: string
  platform: string
  external_post_id: string | null
}

/**
 * Phase 8: refresh per-published-post metrics (views/likes/comments/
 * saves/shares) from Meta Graph and store them on published_posts.
 * Called from index.ts scheduled() AFTER runCommentBot — must never throw.
 */
export async function runMetricsCollector(env: WorkerBindings): Promise<void> {
  try {
    const supabase = createSupabaseClient(env)
    const cutoff = new Date(Date.now() - REFRESH_AFTER_MS).toISOString()

    const { data: accounts, error: accountsError } = await supabase
      .from("meta_accounts")
      .select("*")
    if (accountsError) {
      throw new Error(`metrics: load meta_accounts failed: ${accountsError.message}`)
    }

    let collected = 0
    for (const account of accounts ?? []) {
      try {
        const { data: posts, error: postsError } = await supabase
          .from("published_posts")
          .select("id, platform, external_post_id")
          .eq("meta_account_id", account.id)
          .eq("status", "published")
          .not("external_post_id", "is", null)
          .or(`metrics_captured_at.is.null,metrics_captured_at.lt.${cutoff}`)
          .order("published_at", { ascending: false })
          .limit(MAX_POSTS_PER_ACCOUNT)
        if (postsError) {
          throw new Error(`metrics: load published_posts failed: ${postsError.message}`)
        }

        for (const post of (posts ?? []) as MetricsPost[]) {
          if (!post.external_post_id) continue
          try {
            const patch: Record<string, unknown> = {
              metrics_captured_at: new Date().toISOString(),
            }
            if (post.platform === "instagram" && account.ig_user_id) {
              const m = await getIgMediaMetrics(
                account.ig_user_id,
                account.page_token,
                post.external_post_id,
              )
              patch.views = m.plays ?? null
              patch.likes = m.like_count ?? null
              patch.comments_count = m.comments_count ?? null
              patch.saves = m.saved ?? null
              patch.shares = m.shares ?? null
              patch.permalink = m.permalink ?? null
            } else if (post.platform === "facebook") {
              const m = await getFbVideoMetrics(
                account.fb_page_id,
                account.page_token,
                post.external_post_id,
              )
              patch.views = m.views ?? null
              patch.likes = m.likes ?? null
              patch.comments_count = m.comments_count ?? null
              patch.shares = m.shares ?? null
            } else {
              continue
            }

            const { error: updateError } = await supabase
              .from("published_posts")
              .update(patch)
              .eq("id", post.id)
            if (updateError) {
              throw new Error(`metrics: update post ${post.id} failed: ${updateError.message}`)
            }
            collected++

            await logBot(
              supabase,
              account.user_id,
              "info",
              `Collected metrics for ${post.platform} post ${post.id}`,
              { postId: post.external_post_id },
            )
          } catch (err) {
            console.error(
              `metrics: account ${account.id} post ${post.external_post_id} failed: ${
                err instanceof Error ? err.message : String(err)
              }`,
            )
          }
        }
      } catch (err) {
        console.error(
          `metrics: account ${account.id} failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
      }
    }
    if (collected > 0) {
      console.log(`metrics: refreshed ${collected} post${collected === 1 ? "" : "s"}`)
    }
  } catch (err) {
    console.error(`metrics: run failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}
