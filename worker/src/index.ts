import type { WorkerBindings } from "./supabase"
import { runCron } from "./cron"
import { consume, type DownloadVideoJob } from "./consumer"
import { runCommentBot } from "./comments"
import { serveR2Object } from "./serve"

export default {
  async fetch(request: Request, env: WorkerBindings): Promise<Response> {
    const url = new URL(request.url)
    // Public video endpoint: GET /v/{userId}/{ttVideoId}/video.mp4 (R2 + Range)
    if (url.pathname.startsWith("/v/") && request.method === "GET") {
      const key = decodeURIComponent(url.pathname.slice("/v/".length))
      if (!key || key.includes("..")) {
        return new Response(JSON.stringify({ error: "bad request" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        })
      }
      return serveR2Object(env, key, request)
    }
    return new Response(JSON.stringify({ ok: true, service: "scalehypex-worker" }), {
      headers: { "content-type": "application/json" },
    })
  },
  async scheduled(_event: ScheduledEvent, env: WorkerBindings, ctx: ExecutionContext): Promise<void> {
    await runCron(env, ctx)
    await runCommentBot(env)
  },
  async queue(batch: MessageBatch<DownloadVideoJob>, env: WorkerBindings): Promise<void> {
    await consume(batch, env)
  },
}
