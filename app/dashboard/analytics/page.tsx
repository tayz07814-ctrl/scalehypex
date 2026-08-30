import { redirect } from "next/navigation"
import {
  BarChart3Icon,
  BookmarkIcon,
  EyeIcon,
  HeartIcon,
  MessageCircleIcon,
  type LucideIcon,
} from "lucide-react"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { formatDateTime, timeAgo } from "@/components/dashboard/format"

export const metadata = {
  title: "Analytics",
}

type MetricsRow = {
  id: string
  platform: string
  external_post_id: string | null
  views: number | null
  likes: number | null
  comments_count: number | null
  saves: number | null
  shares: number | null
  permalink: string | null
  published_at: string | null
  tiktok_video_id: string | null
  tiktok_videos: { description: string | null } | null
}

function PlatformBadge({ platform }: { platform: string }) {
  if (platform === "facebook") {
    return <Badge className="bg-blue-500/10 text-blue-600">Facebook</Badge>
  }
  if (platform === "instagram") {
    return (
      <Badge className="bg-gradient-to-r from-fuchsia-500/15 to-pink-500/15 text-fuchsia-600">
        Instagram
      </Badge>
    )
  }
  return <Badge variant="outline">{platform}</Badge>
}

function StatCard({
  label,
  value,
  icon: Icon,
  hue,
}: {
  label: string
  value: number
  icon: LucideIcon
  hue: string
}) {
  return (
    <div className="glass-card card-lift relative overflow-hidden rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-md",
            hue
          )}
        >
          <Icon className="size-4 text-white" />
        </span>
      </div>
      <span className="mt-1 block text-2xl font-black tracking-tight tabular-nums">
        {value.toLocaleString()}
      </span>
    </div>
  )
}

const METRIC_META = {
  views: { label: "Plays", icon: EyeIcon, fill: "from-sky-300 to-sky-500" },
  likes: { label: "Likes", icon: HeartIcon, fill: "from-pink-300 to-rose-500" },
  comments: {
    label: "Comments",
    icon: MessageCircleIcon,
    fill: "from-amber-300 to-amber-500",
  },
  saves: {
    label: "Saves",
    icon: BookmarkIcon,
    fill: "from-violet-300 to-violet-500",
  },
} as const

function MetricBar({
  label,
  value,
  max,
  fill,
}: {
  label: string
  value: number | null
  max: number
  fill: string
}) {
  const width = value == null || max <= 0 ? 0 : Math.max(2, (value / max) * 100)
  return (
    <div className="flex items-center gap-2">
      <span className="w-32 truncate text-xs text-muted-foreground" title={label}>
        {label}
      </span>
      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F3E8E1]">
        <span
          className={cn("block h-full rounded-full bg-gradient-to-r", fill)}
          style={{ width: `${width}%` }}
        />
      </span>
      <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums">
        {value == null ? "—" : value.toLocaleString()}
      </span>
    </div>
  )
}

function MetricChartCard({
  rows,
  metric,
  get,
}: {
  rows: MetricsRow[]
  metric: keyof typeof METRIC_META
  get: (row: MetricsRow) => number | null
}) {
  const meta = METRIC_META[metric]
  const values = rows.map(get).filter((v): v is number => v != null)
  const max = values.length > 0 ? Math.max(...values) : 0
  const total = values.reduce((s, v) => s + v, 0)

  return (
    <div className="glass-card card-lift rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-md bg-gradient-to-br",
              meta.fill
            )}
          >
            <meta.icon className="size-3.5 text-white" />
          </span>
          <span className="text-sm font-semibold">{meta.label}</span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {total.toLocaleString()} total
        </span>
      </div>
      <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1">
        {rows.map((row) => (
          <MetricBar
            key={row.id}
            label={row.tiktok_videos?.description?.trim() ?? `Post #${row.id.slice(0, 8)}`}
            value={get(row)}
            max={max}
            fill={meta.fill}
          />
        ))}
      </div>
    </div>
  )
}

function MetricChip({ value, tint }: { value: number | null; tint: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-10 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
        tint
      )}
    >
      {value == null ? "—" : value.toLocaleString()}
    </span>
  )
}

function PostDescription({ row }: { row: MetricsRow }) {
  const text = row.tiktok_videos?.description?.trim() ?? "(no description)"
  if (row.permalink) {
    return (
      <a
        href={row.permalink}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-52 truncate font-medium underline-offset-2 hover:underline"
        title={`${text} — open on ${row.platform}`}
      >
        {text}
      </a>
    )
  }
  return (
    <span className="block max-w-52 truncate font-medium" title={text}>
      {text}
    </span>
  )
}

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    redirect("/login")
  }
  const user = data.user

  const { data: posts } = await supabase
    .from("published_posts")
    .select(
      "id, platform, external_post_id, views, likes, comments_count, saves, shares, permalink, published_at, tiktok_video_id, tiktok_videos(description)"
    )
    .eq("user_id", user.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(100)
  const rows = (posts ?? []) as unknown as MetricsRow[]

  const totalViews = rows.reduce((s, r) => s + (r.views ?? 0), 0)
  const totalLikes = rows.reduce((s, r) => s + (r.likes ?? 0), 0)
  const totalComments = rows.reduce((s, r) => s + (r.comments_count ?? 0), 0)
  const totalSaves = rows.reduce((s, r) => s + (r.saves ?? 0), 0)

  return (
    <main className="flex flex-1 flex-col md:flex-row">
      <DashboardHeader email={user.email ?? ""} active="/dashboard/analytics" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 sm:px-6 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <span className="text-sm text-muted-foreground">
            Performance of your published posts, refreshed every few hours.
          </span>
        </div>

        {rows.length === 0 ? (
          <Card className="glass-card rounded-2xl bg-transparent">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-violet-500 shadow-lg shadow-violet-500/30">
                <BarChart3Icon className="size-5 text-white" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-medium">No published posts yet</p>
                <p className="text-sm text-muted-foreground">
                  Publish videos to see analytics.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                label="Total views"
                value={totalViews}
                icon={EyeIcon}
                hue="from-sky-400 to-blue-500 shadow-sky-500/30"
              />
              <StatCard
                label="Likes"
                value={totalLikes}
                icon={HeartIcon}
                hue="from-pink-400 to-rose-500 shadow-pink-500/30"
              />
              <StatCard
                label="Comments"
                value={totalComments}
                icon={MessageCircleIcon}
                hue="from-amber-400 to-orange-500 shadow-amber-500/30"
              />
              <StatCard
                label="Saves"
                value={totalSaves}
                icon={BookmarkIcon}
                hue="from-violet-400 to-purple-500 shadow-violet-500/30"
              />
              <StatCard
                label="Posts"
                value={rows.length}
                icon={BarChart3Icon}
                hue="from-emerald-400 to-teal-500 shadow-emerald-500/30"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <MetricChartCard rows={rows} metric="views" get={(r) => r.views} />
              <MetricChartCard rows={rows} metric="likes" get={(r) => r.likes} />
              <MetricChartCard rows={rows} metric="comments" get={(r) => r.comments_count} />
              <MetricChartCard rows={rows} metric="saves" get={(r) => r.saves} />
            </div>

            <Card className="glass-card rounded-2xl bg-transparent">
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Platform</TableHead>
                      <TableHead className="w-[34%]">Post</TableHead>
                      <TableHead>Published</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Likes</TableHead>
                      <TableHead className="text-right">Comments</TableHead>
                      <TableHead className="text-right">Saves</TableHead>
                      <TableHead className="text-right">Shares</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <PlatformBadge platform={row.platform} />
                        </TableCell>
                        <TableCell>
                          <PostDescription row={row} />
                        </TableCell>
                        <TableCell>
                          {row.published_at ? (
                            <span
                              className="text-muted-foreground"
                              title={formatDateTime(row.published_at)}
                            >
                              {timeAgo(row.published_at)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <MetricChip value={row.views} tint="bg-sky-500/10 text-sky-700" />
                        </TableCell>
                        <TableCell className="text-right">
                          <MetricChip value={row.likes} tint="bg-pink-500/10 text-pink-700" />
                        </TableCell>
                        <TableCell className="text-right">
                          <MetricChip value={row.comments_count} tint="bg-amber-500/10 text-amber-700" />
                        </TableCell>
                        <TableCell className="text-right">
                          <MetricChip value={row.saves} tint="bg-violet-500/10 text-violet-700" />
                        </TableCell>
                        <TableCell className="text-right">
                          <MetricChip value={row.shares} tint="bg-emerald-500/10 text-emerald-700" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  )
}
