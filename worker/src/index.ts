import type { WorkerBindings } from "./supabase"
import { runCron } from "./cron"
import { consume, type DownloadVideoJob } from "./consumer"
import { runCommentBot } from "./comments"

export default {
  async fetch(): Promise<Response> {
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
