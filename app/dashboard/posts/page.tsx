import Link from "next/link"
import { redirect } from "next/navigation"
import { VideoIcon } from "lucide-react"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
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
import { formatDateTime, formatDate } from "@/components/dashboard/format"

export const metadata = {
  title: "Posts",
}

type PublishRow = {
  id: string
  platform: string
  status: string
  error: string | null
  published_at: string | null
}

type VideoRow = {
  id: string
  description: string | null
  fetched_at: string
  status: "new" | "downloading" | "ready" | "published" | "failed"
  error: string | null
  published_posts: PublishRow[]
}

function PipelineBadge({
  status,
  error,
}: {
  status: VideoRow["status"]
  error: string | null
}) {
  switch (status) {
    case "new":
      return (
        <Badge className="bg-[#F3E8E1] text-[#8C8078]">Listed</Badge>
      )
    case "downloading":
      return (
        <Badge className="gap-1.5 bg-amber-500/15 text-amber-300">
          <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
          Queued
        </Badge>
      )
    case "ready":
      return (
        <Badge className="bg-sky-500/15 text-sky-300">Ready</Badge>
      )
    case "published":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-300">Published</Badge>
      )
    case "failed":
      return (
        <Badge
          variant="destructive"
          className="bg-rose-500/15 text-rose-300"
          title={error ?? "Download failed"}
        >
          Failed
        </Badge>
      )
  }
}

function PlatformCell({
  posts,
  platform,
}: {
  posts: PublishRow[]
  platform: string
}) {
  const post = posts.find((p) => p.platform === platform)
  if (!post) {
    return <span className="text-muted-foreground">—</span>
  }
  if (post.status === "published") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-300">Published</Badge>
    )
  }
  if (post.status === "failed") {
    return (
      <div className="flex flex-col items-start gap-1">
        <Badge
          variant="destructive"
          className="bg-rose-500/15 text-rose-300"
        >
          Failed
        </Badge>
        {post.error ? (
          <span
            className="line-clamp-2 max-w-52 text-xs text-muted-foreground"
            title={post.error}
          >
            {post.error}
          </span>
        ) : null}
      </div>
    )
  }
  return <Badge className="bg-amber-500/15 text-amber-300">Pending</Badge>
}

function earliestPublishedAt(posts: PublishRow[]): string | null {
  const times = posts
    .filter((p) => p.status === "published" && p.published_at)
    .map((p) => p.published_at as string)
  if (times.length === 0) return null
  return times.sort()[0]
}

export default async function PostsPage() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    redirect("/login")
  }
  const user = data.user

  const { data: videos } = await supabase
    .from("tiktok_videos")
    .select(
      "id, description, fetched_at, status, error, published_posts(id, platform, status, error, published_at)"
    )
    .order("fetched_at", { ascending: false })
    .limit(50)
  const rows = (videos ?? []) as unknown as VideoRow[]

  return (
    <main className="flex flex-1 flex-col md:flex-row">
      <DashboardHeader email={user.email ?? ""} active="/dashboard/posts" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 sm:px-6 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
          <span className="text-sm text-muted-foreground">
            Your latest videos and where they were published.
          </span>
        </div>

        {rows.length === 0 ? (
          <Card className="glass-card rounded-2xl bg-transparent">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-fuchsia-500/30">
                <VideoIcon className="size-5 text-white" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-medium">No videos yet</p>
                <p className="text-sm text-muted-foreground">
                  Connect TikTok and ScaleHypex will track your new videos
                  automatically.
                </p>
              </div>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "glass rounded-lg"
                )}
              >
                Go to overview
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card rounded-2xl bg-transparent">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Video</TableHead>
                    <TableHead>Pipeline</TableHead>
                    <TableHead>Instagram</TableHead>
                    <TableHead>Facebook</TableHead>
                    <TableHead>Published</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const publishedAt = earliestPublishedAt(
                      row.published_posts ?? []
                    )
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="max-w-72">
                          <div className="flex flex-col">
                            <span
                              className="truncate font-medium"
                              title={row.description ?? undefined}
                            >
                              {row.description?.trim()
                                ? row.description
                                : "(no description)"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Detected {formatDate(row.fetched_at)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            <PipelineBadge
                              status={row.status}
                              error={row.error}
                            />
                            {row.status === "failed" && row.error ? (
                              <span
                                className="line-clamp-2 max-w-52 text-xs text-muted-foreground"
                                title={row.error}
                              >
                                {row.error}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <PlatformCell
                            posts={row.published_posts ?? []}
                            platform="instagram"
                          />
                        </TableCell>
                        <TableCell>
                          <PlatformCell
                            posts={row.published_posts ?? []}
                            platform="facebook"
                          />
                        </TableCell>
                        <TableCell>
                          {publishedAt ? (
                            <span
                              className="text-muted-foreground"
                              title={formatDateTime(publishedAt)}
                            >
                              {formatDateTime(publishedAt)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
