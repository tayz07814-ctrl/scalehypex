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
  match_mode: "contains" | "exact" | "starts_with"
  platform: "all" | "instagram" | "facebook"
  priority: number
  comment_reply: string
  dm_message: string | null
  dm_enabled: boolean
}

/** Apply {{name}} / {{username}} / {{comment}} variables to a template. */
function applyVars(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (m, key) => vars[key] ?? m)
}

/** Match a comment against a rule's keywords per its match mode. */
function matchRule(commentText: string, rule: ReplyRule): boolean {
  const text = commentText.toLowerCase().trim()
  const kws = rule.keywords.map((k) => k.toLowerCase().trim()).filter(Boolean)
  if (kws.length === 0) return false
  switch (rule.match_mode) {
    case "exact":
      return kws.some((k) => text === k)
    case "starts_with":
      return kws.some((k) => text.startsWith(k))
    default:
      return kws.some((k) => text.includes(k))
  }
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
          .select(
            "id, keywords, match_mode, platform, priority, comment_reply, dm_message, dm_enabled",
          )
          .eq("user_id", account.user_id)
          .eq("enabled", true)
          .order("priority", { ascending: false })
          .order("created_at", { ascending: true })
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

              // First matching rule for this platform (priority-ordered).
              const candidates = ruleRows.filter(
                (r) => r.platform === "all" || r.platform === post.platform,
              )
              const rule = candidates.find((r) => matchRule(comment.text ?? "", r))
              if (!rule) continue

              const vars = {
                name: comment.from?.name ?? "there",
                username:
                  post.platform === "instagram"
                    ? (account.ig_username ?? "us")
                    : (account.page_name ?? "us"),
                comment: comment.text ?? "",
              }
              const replyText = applyVars(rule.comment_reply, vars).slice(0, 2200)

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
                    account.ig_user_id!,
                    account.page_token,
                    post.external_post_id,
                    replyText,
                  )
                  replyId = reply.id
                }

                // Optional DM to the commenter (IG only — needs their IG-scoped id).
                let dmSent = false
                if (
                  post.platform === "instagram" &&
                  rule.dm_enabled &&
                  rule.dm_message &&
                  account.ig_user_id
                ) {
                  const fromId = comment.from?.id
                  if (fromId) {
                    try {
                      await sendIgDm(
                        account.ig_user_id,
                        account.page_token,
                        fromId,
                        applyVars(rule.dm_message, vars).slice(0, 1000),
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
                    reply_text: replyText,
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
