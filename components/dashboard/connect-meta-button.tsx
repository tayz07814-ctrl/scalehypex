"use client"

import { buttonVariants } from "@/components/ui/button"

export function ConnectMetaButton() {
  return (
    <a href="/api/meta/oauth/start" className={buttonVariants()}>
      Connect Facebook/Instagram
    </a>
  )
}
