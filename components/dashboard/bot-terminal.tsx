"use client"

import * as React from "react"
import { Loader2Icon, PlayIcon, TerminalIcon } from "lucide-react"
import { toast } from "sonner"

import { createBrowserSupabaseClient } from "@/lib/supabase/browser"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
  info: "text-sky-400",
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
  const [running, setRunning] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const runTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

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
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  React.useEffect(() => {
    return () => { if (runTimerRef.current) clearTimeout(runTimerRef.current) }
  }, [])

  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  async function runBot() {
    setRunning(true)
    try {
      const res = await fetch("/api/bot/run", { method: "POST" })
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (res.ok) toast.success("Bot run started - watch the logs below")
      else toast.error(body?.error ?? "Failed to start the bot run")
    } catch {
      toast.error("Could not reach the bot runner")
    } finally {
      runTimerRef.current = setTimeout(() => setRunning(false), 2500)
    }
  }

  return (
    <Card className="glass-card rounded-2xl bg-transparent">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4A3F3A] to-[#6B584F] shadow-lg shadow-[#4A3F3A]/40">
            <TerminalIcon className="size-4.5 text-emerald-400" />
          </span>
          <CardTitle>Bot terminal</CardTitle>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" className="btn-hero rounded-lg" onClick={runBot} disabled={running}>
              {running ? <Loader2Icon className="animate-spin" /> : <PlayIcon />}
              {running ? "Running..." : "Run bot now"}
            </Button>
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                connected ? "bg-emerald-500/15 text-emerald-600" : "bg-[#F3E8E1] text-[#A79A92]"
              )}
            >
              <span className={cn("size-1.5 rounded-full", connected ? "animate-pulse bg-emerald-500" : "bg-[#C0B4AA]")} />
              {connected ? "Live" : "Connecting..."}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={scrollRef}
          className="h-[420px] overflow-y-auto rounded-xl border border-slate-800 bg-black p-4 font-mono text-[13px] leading-relaxed shadow-inner"
        >
          <div className="mb-1 flex items-center gap-2 text-slate-500">
            <span className="text-emerald-400">PS C:&gt;</span>
            <span>scalehypex-bot --tail -f</span>
          </div>
          {logs.length === 0 ? (
            <p className="text-slate-500">
              Waiting for bot activity... connect TikTok + Meta and turn on auto-publish to see the pipeline here.
            </p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-2 py-0.5">
                <span className="shrink-0 text-slate-500">{timeAgo(log.created_at)}</span>
                <span className={cn("shrink-0 font-bold", LEVEL_COLOR[log.level] ?? "text-slate-300")}>
                  [{LEVEL_TAG[log.level] ?? "INFO"}]
                </span>
                <span className={cn("break-words", LEVEL_COLOR[log.level] ?? "text-slate-200")}>
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
