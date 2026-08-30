import { createSupabaseClient, type WorkerBindings } from "./supabase"
import {
  getFbPostComments,
  getIgMediaComments,
  postFbCommentReply,
  postIgComment,
  sendIgDm,
} from "../../lib/meta/api"
import { logBot } from "./botlog"

/** Max auto-replies per run, across all accounts (Graph API rate-limit hygiene). */
const MAX_REPLIES_PER_RUN = 20

type ReplyRule = {
  id: string
  keywords: string[]
  comment_reply: string
  dm_message: string | null
}

/** Match a comment against a rule's keywords (case-insensitive substring). */
function matchRule(commentText: string, rule: ReplyRule): boolean {
  const lower = commentText.toLowerCase()
  return rule.keywords.some((k) => k.trim() !== "" && lower.includes(k.toLowerCase()))
}

/**
 * Phase 7: poll comments on our published posts, auto-reply using keyword
 * rules (reply_rules). If a rule has a DM template, also DM the commenter.
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
          .select("auto_reply")
          .eq("user_id", account.user_id)
          .maybeSingle()
        if (!settings || settings.auto_reply !== true) continue

        // Load this user's keyword rules (enabled only).
        const { data: rules } = await supabase
          .from("reply_rules")
          .select("id, keywords, comment_reply, dm_message")
          .eq("user_id", account.user_id)
          .eq("enabled", true)
        const ruleRows = (rules ?? []) as ReplyRule[]
        if (ruleRows.length === 0) continue

        await logBot(supabase, account.user_id, "info", `Comment bot: checking @${account.page_name ?? account.ig_username ?? "account"} (${ruleRows.length} rule(s) active)`, {
          rules: ruleRows.length,
        })

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
            await logBot(supabase, account.user_id, "info", `Checking comments on ${post.platform} post ${post.external_post_id}`, {
              platform: post.platform,
              postId: post.external_post_id,
            })
            let comments: { id: string; text: string; from?: { id?: string; name?: string } }[]
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

              // Find the first matching rule for this comment.
              const rule = ruleRows.find((r) => matchRule(comment.text ?? "", r))
              if (!rule) continue

              try {
                let replyId: string
                if (post.platform === "facebook") {
                  const reply = await postFbCommentReply(
                    comment.id,
                    account.page_token,
                    rule.comment_reply,
                  )
                  replyId = reply.id
                } else {
                  const reply = await postIgComment(
                    account.ig_user_id!,
                    account.page_token,
                    post.external_post_id,
                    rule.comment_reply,
                  )
                  replyId = reply.id
                }

                // Optional DM to the commenter (IG only — needs their IG-scoped id).
                let dmSent = false
                if (post.platform === "instagram" && rule.dm_message && account.ig_user_id) {
                  const fromId = comment.from?.id
                  if (fromId) {
                    try {
                      await sendIgDm(
                        account.ig_user_id,
                        account.page_token,
                        fromId,
                        rule.dm_message,
                      )
                      dmSent = true
                    } catch (dmErr) {
                      console.error(
                        `comments: account ${account.id} DM to ${fromId} failed: ${
                          dmErr instanceof Error ? dmErr.message : String(dmErr)
                        }`,
                      )
                    }
                  }
                }

                const { error: insertError } = await supabase
                  .from("replied_comments")
                  .insert({
                    meta_account_id: account.id,
                    platform: post.platform,
                    external_comment_id: comment.id,
                    external_reply_id: replyId,
                    reply_text: rule.comment_reply,
                  })
                if (insertError) {
                  throw new Error(`insert replied_comments failed: ${insertError.message}`)
                }
                repliedSet.add(key)
                replies++
                totalReplies++

                await logBot(
                  supabase,
                  account.user_id,
                  "success",
                  `Auto-replied to ${post.platform} comment (rule: ${rule.keywords.join(", ")})`,
                  { commentId: comment.id, dmSent },
                )
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
