"use client"

import * as React from "react"
import { toast } from "sonner"
import { PlusIcon, Trash2Icon, MessageSquareTextIcon } from "lucide-react"

import { createBrowserSupabaseClient } from "@/lib/supabase/browser"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type Rule = {
  id: string
  keywords: string[]
  comment_reply: string
  dm_message: string | null
  enabled: boolean
}

type DraftRule = {
  id?: string
  keywords: string
  comment_reply: string
  dm_message: string
  enabled: boolean
}

export function ReplyRulesForm({ initial }: { initial: Rule[] }) {
  const [rules, setRules] = React.useState<DraftRule[]>(
    (initial ?? []).map((r) => ({
      id: r.id,
      keywords: r.keywords.join(", "),
      comment_reply: r.comment_reply,
      dm_message: r.dm_message ?? "",
      enabled: r.enabled,
    }))
  )
  const [saving, setSaving] = React.useState(false)

  function addRule() {
    setRules((prev) => [
      ...prev,
      { keywords: "", comment_reply: "", dm_message: "", enabled: true },
    ])
  }

  function updateRule(i: number, patch: Partial<DraftRule>) {
    setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  function removeRule(i: number) {
    setRules((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (saving) return
    const supabase = createBrowserSupabaseClient()
    const { data } = await supabase.auth.getUser()
    const userId = data.user?.id
    if (!userId) {
      toast.error("Not signed in. Sign in again to save rules.")
      return
    }

    // Validate: each rule needs keywords + a comment reply.
    const valid = rules.filter(
      (r) => r.keywords.trim() !== "" && r.comment_reply.trim() !== ""
    )
    if (valid.length !== rules.length) {
      toast.error("Each rule needs keywords and a comment reply.")
      return
    }

    setSaving(true)
    try {
      // Delete all existing rules for this user, then re-insert (simple replace).
      await supabase.from("reply_rules").delete().eq("user_id", userId)
      if (valid.length > 0) {
        const { error } = await supabase.from("reply_rules").insert(
          valid.map((r) => ({
            user_id: userId,
            keywords: r.keywords.split(",").map((k) => k.trim()).filter(Boolean),
            comment_reply: r.comment_reply.trim(),
            dm_message: r.dm_message.trim() !== "" ? r.dm_message.trim() : null,
            enabled: r.enabled,
          }))
        )
        if (error) throw error
      }
      toast.success("Reply rules saved.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save rules")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="glass-card card-lift rounded-2xl bg-transparent">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/30">
            <MessageSquareTextIcon className="size-4.5 text-white" />
          </span>
          <CardTitle>Keyword auto-reply rules</CardTitle>
        </div>
        <CardDescription>
          When a comment matches a keyword, the bot replies in the comments and
          (optionally) sends a DM to that person on Instagram.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rules yet. Add one to start auto-replying to keywords.
          </p>
        ) : (
          rules.map((rule, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-xl border border-white/10 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-medium">Rule {i + 1}</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(v) => updateRule(i, { enabled: v })}
                    aria-label={`Enable rule ${i + 1}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRule(i)}
                    aria-label={`Delete rule ${i + 1}`}
                  >
                    <Trash2Icon className="size-4 text-rose-400" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`keywords-${i}`}>Keywords (comma-separated)</Label>
                <Input
                  id={`keywords-${i}`}
                  value={rule.keywords}
                  onChange={(e) => updateRule(i, { keywords: e.target.value })}
                  placeholder="price, cost, how much"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`reply-${i}`}>Comment reply</Label>
                <Input
                  id={`reply-${i}`}
                  value={rule.comment_reply}
                  onChange={(e) => updateRule(i, { comment_reply: e.target.value })}
                  placeholder="Check your DMs!"
                  maxLength={2200}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`dm-${i}`}>DM message (optional, Instagram only)</Label>
                <Input
                  id={`dm-${i}`}
                  value={rule.dm_message}
                  onChange={(e) => updateRule(i, { dm_message: e.target.value })}
                  placeholder="Hey! Thanks for asking — here's the info…"
                  maxLength={1000}
                />
              </div>
            </div>
          ))
        )}

        <Button variant="outline" onClick={addRule} className="w-full">
          <PlusIcon className="mr-2 size-4" />
          Add rule
        </Button>
      </CardContent>
      <div className="px-6 pb-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="btn-hero rounded-lg"
        >
          {saving ? "Saving…" : "Save rules"}
        </Button>
      </div>
    </Card>
  )
}
