"use client"

import * as React from "react"
import { toast } from "sonner"
import { BotIcon } from "lucide-react"

import { createBrowserSupabaseClient } from "@/lib/supabase/browser"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type InitialSettings = {
  auto_publish: boolean
  auto_reply: boolean
  reply_template: string | null
} | null

export function BotSettingsForm({ initial }: { initial: InitialSettings }) {
  const [autoPublish, setAutoPublish] = React.useState(
    initial?.auto_publish ?? false
  )
  const [autoReply, setAutoReply] = React.useState(
    initial?.auto_reply ?? false
  )
  const [template, setTemplate] = React.useState(
    initial?.reply_template ?? ""
  )
  const [saving, setSaving] = React.useState(false)

  async function handleSave() {
    if (saving) return
    const supabase = createBrowserSupabaseClient()
    const { data } = await supabase.auth.getUser()
    const userId = data.user?.id
    if (!userId) {
      toast.error("Not signed in. Sign in again to save settings.")
      return
    }
    setSaving(true)
    const { error } = await supabase.from("bot_settings").upsert({
      user_id: userId,
      auto_publish: autoPublish,
      auto_reply: autoReply,
      reply_template: template.trim() !== "" ? template.trim() : null,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Settings saved.")
    }
  }

  return (
    <Card className="glass-card card-lift rounded-2xl bg-transparent">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30">
            <BotIcon className="size-4.5 text-white" />
          </span>
          <CardTitle>Automation</CardTitle>
        </div>
        <CardDescription>
          What ScaleHypex does automatically on your accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Label>Auto-publish new videos</Label>
            <p className="text-sm text-muted-foreground">
              Publish every new TikTok to your Instagram Reels and Facebook
              Pages as soon as it finishes downloading.
            </p>
          </div>
          <Switch
            checked={autoPublish}
            onCheckedChange={setAutoPublish}
            aria-label="Auto-publish new videos"
          />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Label>Auto-reply to comments</Label>
            <p className="text-sm text-muted-foreground">
              Reply to new comments on your published posts using the template
              below.
            </p>
          </div>
          <Switch
            checked={autoReply}
            onCheckedChange={setAutoReply}
            aria-label="Auto-reply to comments"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="reply-template">Reply template</Label>
          <Input
            id="reply-template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder="Thanks for the comment!"
            maxLength={2200}
          />
          <p className="text-sm text-muted-foreground">
            Sent as every auto-reply. Leave empty to use the default
            &quot;Thanks for the comment!&quot;
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="btn-hero rounded-lg"
        >
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </CardFooter>
    </Card>
  )
}
