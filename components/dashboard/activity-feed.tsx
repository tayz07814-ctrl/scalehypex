import {
  Activity as ActivityIcon,
  DownloadIcon,
  RocketIcon,
  SkipForwardIcon,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatDateTime, timeAgo } from "@/components/dashboard/format"

export type ActivityItem = {
  action: string
  details: Record<string, unknown>
  created_at: string
}

/** Humanize an activity_log row into a title + optional muted detail line. */
function describeActivity(
  action: string,
  details: Record<string, unknown>
): { title: string; meta?: string } {
  const videoId =
    typeof details.ttVideoId === "string" ? details.ttVideoId : undefined

  switch (action) {
    case "video_downloaded":
      return {
        title: "Video downloaded",
        meta: videoId ? `TikTok video ${videoId}` : undefined,
      }
    case "publish_skipped": {
      const reason =
        details.reason === "auto_publish_disabled"
          ? "auto-publish is disabled"
          : details.reason != null
            ? String(details.reason)
            : "skipped"
      return {
        title: "Publish skipped",
        meta: videoId ? `${videoId} — ${reason}` : reason,
      }
    }
    case "video_published": {
      const published = Number(details.published ?? 0)
      const failed = Number(details.failed ?? 0)
      const parts = [`${published} published`]
      if (failed > 0) parts.push(`${failed} failed`)
      return {
        title: "Publish run finished",
        meta: videoId ? `${videoId} — ${parts.join(", ")}` : parts.join(", "),
      }
    }
    default: {
      const title = action.replace(/_/g, " ")
      const entries = Object.keys(details)
      return {
        title,
        meta: entries.length > 0 ? JSON.stringify(details) : undefined,
      }
    }
  }
}

function ActivityIconFor({ action }: { action: string }) {
  let Icon = ActivityIcon
  let hue = "from-slate-400 to-slate-500 shadow-slate-500/20"
  switch (action) {
    case "video_downloaded":
      Icon = DownloadIcon
      hue = "from-cyan-400 to-blue-500 shadow-cyan-500/25"
      break
    case "publish_skipped":
      Icon = SkipForwardIcon
      hue = "from-amber-400 to-orange-500 shadow-amber-500/25"
      break
    case "video_published":
      Icon = RocketIcon
      hue = "from-emerald-400 to-teal-500 shadow-emerald-500/25"
      break
  }
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-md",
        hue
      )}
    >
      <Icon className="size-4 text-white" />
    </span>
  )
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="glass-card rounded-2xl bg-transparent">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Nothing here yet. Once your TikTok is connected, downloads and
            publishes will show up here.
          </p>
        ) : (
          <ul>
            {items.map((item, i) => {
              const { title, meta } = describeActivity(
                item.action,
                item.details ?? {}
              )
              return (
                <li
                  key={`${item.created_at}-${i}`}
                  className="flex items-center justify-between gap-4 rounded-lg px-1 py-2.5 transition-colors hover:bg-white/[0.04] first:pt-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ActivityIconFor action={item.action} />
                    <div className="min-w-0">
                      <p className="truncate text-sm">{title}</p>
                      {meta ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {meta}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <time
                    title={formatDateTime(item.created_at)}
                    className="shrink-0 text-xs text-muted-foreground"
                  >
                    {timeAgo(item.created_at)}
                  </time>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
