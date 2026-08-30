import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { BotTerminal } from "@/components/dashboard/bot-terminal"

export const metadata = {
  title: "Bot Terminal",
}

export default async function TerminalPage() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    redirect("/login")
  }
  const user = data.user

  return (
    <main className="flex flex-1 flex-col">
      <DashboardHeader email={user.email ?? ""} active="/dashboard/terminal" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Bot Terminal</h1>
          <span className="text-sm text-muted-foreground">
            Live view of what the bot is doing — fetching, publishing, replying.
          </span>
        </div>

        <BotTerminal />
      </div>
    </main>
  )
}
