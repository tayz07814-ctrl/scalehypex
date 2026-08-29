import { createSupabaseClient, type WorkerBindings } from "./supabase"
import {
  getFbPostComments,
  getIgMediaComments,
  postFbCommentReply,
  postIgComment,
} from "../../lib/meta/api"

/** Max auto-replies per run, across all accounts (Graph API rate-limit hygiene). */
const MAX_REPLIES_PER_RUN = 20

/**
 * Phase 7: poll comments on our published posts, auto-reply.
 * Called from index.ts scheduled() AFTER runCron — must never throw.
 */
export async function runCommentBot(env: WorkerBindings): Promise<void> {
  try {
    const supabase = createSupabaseClient(env)
    let totalReplies = 0

    const { data: accounts, error: accountsError } = await supabase
      .from("meta_accounts")
      .select("*")
    if (accountsError) throw new Error(`comments: load meta_accounts failed: ${accountsError.message}`)

    for (const account of accounts ?? []) {
      let replies = 0
      try {
        const { data: settings } = await supabase
          .from("bot_settings")
          .select("auto_reply, reply_template")
          .eq("user_id", account.user_id)
          .maybeSingle()
        if (settings && settings.auto_reply === true) {
          const replyText = (settings.reply_template ?? "Thanks for the comment!").slice(0, 2200)

          const { data: posts, error: postsError } = await supabase
            .from("published_posts")
            .select("id, platform, external_post_id")
            .eq("meta_account_id", account.id)
            .eq("status", "published")
            .not("external_post_id", "is", null)
          if (postsError) {
            throw new Error(`comments: load published_posts failed: ${postsError.message}`)
          }

          const { data: repliedRows } = await supabase
            .from("replied_comments")
            .select("external_comment_id, platform")
            .eq("meta_account_id", account.id)
          const repliedSet = new Set<string>(
            (repliedRows ?? []).map((r) => `${r.platform}:${r.external_comment_id}`),
          )

          for (const post of posts ?? []) {
            if (totalReplies >= MAX_REPLIES_PER_RUN) break

            try {
              let comments: { id: string; text: string; from?: { name?: string } }[]
              if (post.platform === "facebook") {
                const res = await getFbPostComments(post.external_post_id, account.page_token)
                comments = res.data
              } else if (post.platform === "instagram") {
                if (!account.ig_user_id) continue
                const res = await getIgMediaComments(
                  account.ig_user_id,
                  account.page_token,
                  post.external_post_id,
                )
                comments = res.data
              } else {
                continue
              }

              for (const comment of comments) {
                if (totalReplies >= MAX_REPLIES_PER_RUN) break
                const key = `${post.platform}:${comment.id}`
                if (repliedSet.has(key)) continue
                try {
                  let replyId: string
                  if (post.platform === "facebook") {
                    const reply = await postFbCommentReply(
                      comment.id,
                      account.page_token,
                      replyText,
                    )
                    replyId = reply.id
                  } else {
                    const reply = await postIgComment(
                      account.ig_user_id,
                      account.page_token,
                      post.external_post_id,
                      replyText,
                    )
                    replyId = reply.id
                  }
                  const { error: insertError } = await supabase
                    .from("replied_comments")
                    .insert({
                      meta_account_id: account.id,
                      platform: post.platform,
                      external_comment_id: comment.id,
                      external_reply_id: replyId,
                      reply_text: replyText,
                    })
                  if (insertError) {
                    throw new Error(`insert replied_comments failed: ${insertError.message}`)
                  }
                  repliedSet.add(key)
                  replies++
                  totalReplies++
                } catch (err) {
                  console.error(
                    `comments: account ${account.id} comment ${comment.id} failed: ${
                      err instanceof Error ? err.message : String(err)
                    }`,
                  )
                }
              }
            } catch (err) {
              console.error(
                `comments: account ${account.id} post ${post.external_post_id} failed: ${
                  err instanceof Error ? err.message : String(err)
                }`,
              )
            }
          }
        }
      } catch (err) {
        console.error(
          `comments: account ${account.id} failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
      }
      console.log(`comments: account ${account.id} — ${replies} repl${replies === 1 ? "y" : "ies"}`)
    }
  } catch (err) {
    console.error(`comments: run failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}
