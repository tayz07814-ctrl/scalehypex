"use client"

import * as React from "react"
import { TerminalIcon } from "lucide-react"

import { createBrowserSupabaseClient } from "@/lib/supabase/browser"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { timeAgo } from "@/components/dashboard/format"

type BotLog = {
  id: number
  level: "info" | "success" | "warn" | "error"
  message: string
  details: Record<string, unknown>
  created_at: string
}

const LEVEL_COLOR: Record<BotLog["level"], string> = {
  info: "text-slate-300",
  success: "text-emerald-400",
  warn: "text-amber-400",
  error: "text-rose-400",
}

const LEVEL_TAG: Record<BotLog["level"], string> = {
  info: "INFO",
  success: "OK",
  warn: "WARN",
  error: "ERR",
}

export function BotTerminal() {
  const [logs, setLogs] = React.useState<BotLog[]>([])
  const [connected, setConnected] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Poll bot_logs every 3s (newest first, limit 200).
  React.useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from("bot_logs")
        .select("id, level, message, details, created_at")
        .order("created_at", { ascending: false })
        .limit(200)
      if (cancelled) return
      if (!error && data) {
        setLogs((data as BotLog[]).reverse())
        setConnected(true)
      }
    }

    load()
    const t = setInterval(load, 3000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  // Auto-scroll to bottom on new logs.
  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  return (
    <Card className="glass-card rounded-2xl bg-transparent">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg shadow-slate-900/40">
            <TerminalIcon className="size-4.5 text-emerald-400" />
          </span>
          <CardTitle>Bot terminal</CardTitle>
          <span
            className={cn(
              "ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              connected
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-slate-500/15 text-slate-400"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                connected ? "animate-pulse bg-emerald-400" : "bg-slate-500"
              )}
            />
            {connected ? "Live" : "Connecting…"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={scrollRef}
          className="h-[420px] overflow-y-auto rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-[13px] leading-relaxed"
        >
          {logs.length === 0 ? (
            <p className="text-slate-500">
              Waiting for bot activity… connect TikTok + Meta and turn on
              auto-publish to see the pipeline here.
            </p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-2 py-0.5">
                <span className="shrink-0 text-slate-600">
                  {timeAgo(log.created_at)}
                </span>
                <span
                  className={cn(
                    "shrink-0 font-bold",
                    LEVEL_COLOR[log.level] ?? "text-slate-300"
                  )}
                >
                  [{LEVEL_TAG[log.level] ?? "INFO"}]
                </span>
                <span className={cn("break-words", LEVEL_COLOR[log.level] ?? "text-slate-300")}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
