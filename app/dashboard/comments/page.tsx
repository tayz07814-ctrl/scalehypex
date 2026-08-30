import { redirect } from "next/navigation"
import { MessageSquareTextIcon } from "lucide-react"

import { createServerSupabaseClient } from "@/lib/supabase/server"
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
  title: "Comments",
}

type ReplyRow = {
  id: string
  platform: string
  reply_text: string | null
  created_at: string
  meta_accounts: { page_name: string | null } | null
}

function PlatformBadge({ platform }: { platform: string }) {
  if (platform === "facebook") {
    return (
      <Badge className="bg-blue-500/15 text-blue-300">Facebook</Badge>
    )
  }
  if (platform === "instagram") {
    return (
      <Badge className="bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 text-fuchsia-300">
        Instagram
      </Badge>
    )
  }
  return <Badge variant="outline">{platform}</Badge>
}

export default async function CommentsPage() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    redirect("/login")
  }
  const user = data.user

  const { data: replies } = await supabase
    .from("replied_comments")
    .select("id, platform, reply_text, created_at, meta_accounts(page_name)")
    .order("created_at", { ascending: false })
    .limit(50)
  const rows = (replies ?? []) as unknown as ReplyRow[]

  return (
    <main className="flex flex-1 flex-col">
      <DashboardHeader email={user.email ?? ""} active="/dashboard/comments" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 sm:px-6 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Comments</h1>
          <span className="text-sm text-muted-foreground">
            Every auto-reply the bot has sent, newest first.
          </span>
        </div>

        {rows.length === 0 ? (
          <Card className="glass-card rounded-2xl bg-transparent">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/30">
                <MessageSquareTextIcon className="size-5 text-white" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-medium">No replies yet</p>
                <p className="text-sm text-muted-foreground">
                  Turn on auto-reply in Settings — when the bot answers
                  comments on your pages, each reply is logged here.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card rounded-2xl bg-transparent">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead className="w-[45%]">Reply</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <PlatformBadge platform={row.platform} />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {row.meta_accounts?.page_name ?? "Unknown page"}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-96">
                        <span
                          className="block truncate"
                          title={row.reply_text ?? undefined}
                        >
                          {row.reply_text ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-muted-foreground"
                          title={formatDateTime(row.created_at)}
                        >
                          {timeAgo(row.created_at)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
