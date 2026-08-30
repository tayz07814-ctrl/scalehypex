import { redirect } from "next/navigation"
import {
  ClapperboardIcon,
  Music2Icon,
  RocketIcon,
  SparklesIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getUserInfo, refreshAccessToken } from "@/lib/tiktok/api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ActivityFeed, type ActivityItem } from "@/components/dashboard/activity-feed"
import { ConnectMetaButton } from "@/components/dashboard/connect-meta-button"
import { BotTerminal } from "@/components/dashboard/bot-terminal"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DisconnectMetaButton } from "@/components/dashboard/disconnect-meta-button"
import { DisconnectTikTokButton } from "@/components/dashboard/disconnect-tiktok-button"

export const metadata = {
  title: "Dashboard",
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  hue,
}: {
  label: string
  value: number | string
  hint: string
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
      <span className="text-gradient mt-1 block text-3xl font-black tracking-tight">
        {value}
      </span>
      <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    redirect("/login")
  }
  const user = data.user

  // UI-safe columns only — tokens never leave the DB.
  const { data: tiktokAccount } = await supabase
    .from("tiktok_accounts")
    .select(
      "id, username, avatar_url, access_token, refresh_token, token_expires_at, created_at"
    )
    .eq("user_id", user.id)
    .maybeSingle()

  const { data: metaAccounts } = await supabase
    .from("meta_accounts")
    .select("id, fb_page_id, page_name, ig_username, ig_picture_url, created_at")
    .eq("user_id", user.id)

  // Auto-heal: rows connected before avatar storage existed may have NULL
  // username/avatar_url. Refresh the TikTok token if needed and fetch the
  // profile server-side. Tokens are selected but never rendered to the client.
  let tiktokUsername = tiktokAccount?.username ?? null
  let tiktokAvatar = tiktokAccount?.avatar_url ?? null
  if (
    tiktokAccount &&
    (!tiktokUsername || !tiktokAvatar) &&
    (tiktokAccount.access_token || tiktokAccount.refresh_token)
  ) {
    try {
      let token = tiktokAccount.access_token
      let refreshToken = tiktokAccount.refresh_token
      let expiresAt = tiktokAccount.token_expires_at
      const needsRefresh =
        !token ||
        !expiresAt ||
        Date.parse(expiresAt) - Date.now() <= 60 * 60 * 1000
      if (needsRefresh && refreshToken) {
        const tokens = await refreshAccessToken(refreshToken)
        token = tokens.access_token
        refreshToken = tokens.refresh_token ?? refreshToken
        expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      }
      if (token) {
        const ttUser = await getUserInfo(token)
        tiktokUsername = ttUser.display_name ?? tiktokUsername
        tiktokAvatar = ttUser.avatar_url ?? tiktokAvatar
        await supabase
          .from("tiktok_accounts")
          .update({
            username: tiktokUsername,
            avatar_url: tiktokAvatar,
            access_token: token,
            refresh_token: refreshToken,
            token_expires_at: expiresAt,
          })
          .eq("id", tiktokAccount.id)
      }
    } catch {
      // Best-effort: fall back to the letter avatar if this fails.
    }
  }

  const { count: videoCount } = await supabase
    .from("tiktok_videos")
    .select("*", { count: "exact", head: true })

  const { count: publishedCount } = await supabase
    .from("published_posts")
    .select("*", { count: "exact", head: true })
    .eq("status", "published")

  const { data: activity } = await supabase
    .from("activity_log")
    .select("action, details, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(15)

  const metaCount = metaAccounts?.length ?? 0
  const connectedCount = (tiktokAccount ? 1 : 0) + metaCount

  return (
    <main className="flex flex-1 flex-col md:flex-row">
      <DashboardHeader email={user.email ?? ""} active="/dashboard" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 sm:px-6 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Overview
          </h1>
          <span className="text-sm text-muted-foreground">
            Your accounts, pipeline, and recent activity.
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Videos tracked"
            value={videoCount ?? 0}
            hint="New TikToks detected so far"
            icon={VideoIcon}
            hue="from-violet-500 to-indigo-500 shadow-violet-500/30"
          />
          <StatCard
            label="Published"
            value={publishedCount ?? 0}
            hint="Posts live on IG + FB"
            icon={RocketIcon}
            hue="from-emerald-400 to-teal-500 shadow-emerald-500/30"
          />
          <StatCard
            label="Connected accounts"
            value={connectedCount}
            hint={
              tiktokAccount
                ? `TikTok · ${metaCount} Meta account${metaCount === 1 ? "" : "s"}`
                : "Connect TikTok and Meta to start"
            }
            icon={SparklesIcon}
            hue="from-fuchsia-500 to-pink-500 shadow-fuchsia-500/30"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="glass-card card-lift rounded-2xl bg-transparent">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 shadow-lg shadow-fuchsia-500/30">
                  <Music2Icon className="size-4.5 text-white" />
                </span>
                <CardTitle>TikTok</CardTitle>
              </div>
              <CardDescription>
                Connect your account so ScaleHypex can detect new videos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tiktokAccount ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar>
                      <AvatarImage
                        src={tiktokAvatar ?? undefined}
                        alt={tiktokUsername ?? "TikTok account"}
                      />
                      <AvatarFallback>
                        {(tiktokUsername ?? "T").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {tiktokUsername ?? "TikTok account"}
                    </span>
                    <Badge className="bg-emerald-500/15 text-emerald-600">
                      Connected
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Connected{" "}
                    {new Date(tiktokAccount.created_at).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No TikTok account connected yet.
                </p>
              )}
            </CardContent>
            <CardFooter>
              {tiktokAccount ? (
                <DisconnectTikTokButton />
              ) : (
                <a
                  href="/api/tiktok/oauth/start"
                  className={cn(buttonVariants(), "btn-hero rounded-lg")}
                >
                  Connect TikTok
                </a>
              )}
            </CardFooter>
          </Card>

          <Card className="glass-card card-lift rounded-2xl bg-transparent">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/30">
                  <ClapperboardIcon className="size-4.5 text-white" />
                </span>
                <CardTitle>Meta (Instagram + Facebook)</CardTitle>
              </div>
              <CardDescription>
                Publish to Instagram Reels and Facebook Pages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metaAccounts && metaAccounts.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {metaAccounts.map((account) => (
                    <div key={account.id} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar>
                          <AvatarImage
                            src={
                              account.fb_page_id
                                ? `https://graph.facebook.com/${account.fb_page_id}/picture?type=normal`
                                : undefined
                            }
                            alt={account.page_name ?? "Facebook Page"}
                          />
                          <AvatarFallback>
                            {(account.page_name ?? "F").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {account.page_name ?? "Facebook Page"}
                        </span>
                        <Badge className="bg-emerald-500/15 text-emerald-600">
                          Connected
                        </Badge>
                      </div>
                      {account.ig_username ? (
                        <div className="flex items-center gap-2.5 pl-1">
                          <Avatar size="sm">
                            <AvatarImage
                              src={account.ig_picture_url ?? undefined}
                              alt={account.ig_username}
                            />
                            <AvatarFallback>
                              {account.ig_username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">
                            @{account.ig_username}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No Meta accounts connected yet.
                </p>
              )}
            </CardContent>
            <CardFooter>
              {metaAccounts && metaAccounts.length > 0 ? (
                <DisconnectMetaButton />
              ) : (
                <ConnectMetaButton />
              )}
            </CardFooter>
          </Card>
        </div>

        <BotTerminal />

        <ActivityFeed items={(activity ?? []) as ActivityItem[]} />
      </div>
    </main>
  )
}
