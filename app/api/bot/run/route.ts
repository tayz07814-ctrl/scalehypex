import { createServerSupabaseClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const WORKER_RUN_URL =
  process.env.WORKER_RUN_URL ?? "https://scalehypex.tayz07814.workers.dev"

/**
 * POST /api/bot/run
 * Triggers one manual bot cycle on the Cloudflare Worker (runCron + runCommentBot).
 */
export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return Response.json({ error: "Not signed in" }, { status: 401 })
  }

  const secret = process.env.WORKER_RUN_SECRET
  if (!secret) {
    return Response.json(
      { error: "Worker run secret not configured" },
      { status: 500 },
    )
  }

  try {
    const res = await fetch(`${WORKER_RUN_URL}/run`, {
      method: "POST",
      headers: { "x-run-secret": secret },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      return Response.json(
        { error: `Worker rejected the run (${res.status})` },
        { status: 502 },
      )
    }
    return Response.json({ ok: true })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Worker request failed"
    return Response.json({ error: message }, { status: 502 })
  }
}