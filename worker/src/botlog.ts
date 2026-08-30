import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Append a line to the live bot terminal (bot_logs table).
 * Never throws — the terminal must never break the pipeline.
 */
export async function logBot(
  supabase: SupabaseClient,
  userId: string,
  level: "info" | "success" | "warn" | "error",
  message: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase.from("bot_logs").insert({
      user_id: userId,
      level,
      message,
      details,
    })
  } catch (err) {
    console.error(`botlog: insert failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}
