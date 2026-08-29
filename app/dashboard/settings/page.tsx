import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { BotSettingsForm } from "@/components/dashboard/bot-settings-form"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

export const metadata = {
  title: "Settings",
}

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    redirect("/login")
  }
  const user = data.user

  // Row may not exist yet — the form treats that as all defaults off.
  const { data: settings } = await supabase
    .from("bot_settings")
    .select("auto_publish, auto_reply, reply_template")
    .eq("user_id", user.id)
    .maybeSingle()

  return (
    <main className="flex flex-1 flex-col">
      <DashboardHeader email={user.email ?? ""} active="/dashboard/settings" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <span className="text-sm text-muted-foreground">
            Control what ScaleHypex does automatically on your accounts.
          </span>
        </div>

        <BotSettingsForm initial={settings} />
      </div>
    </main>
  )
}
