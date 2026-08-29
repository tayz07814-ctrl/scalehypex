"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function DisconnectMetaButton() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  async function handleDisconnect() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch("/api/meta/disconnect", { method: "POST" })
      const body = (await res.json().catch(() => null)) as {
        error?: string
      } | null
      if (!res.ok) {
        toast.error(body?.error ?? "Failed to disconnect Meta.")
        return
      }
      toast.success("Meta disconnected.")
      router.refresh()
    } catch {
      toast.error("Failed to disconnect Meta.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDisconnect}
      disabled={loading}
    >
      Disconnect
    </Button>
  )
}
