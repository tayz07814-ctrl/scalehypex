"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { MoonIcon, SparklesIcon, SunIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const OPTIONS = [
  { key: "light", label: "Light", Icon: SunIcon },
  { key: "dark", label: "Dark", Icon: MoonIcon },
  { key: "neo", label: "Neo", Icon: SparklesIcon },
] as const

const emptySubscribe = () => () => {}

/** 3-way theme switcher: Light / Dark / Neo (original indigo glass). */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  if (!mounted) {
    return (
      <div
        aria-hidden
        className={cn("inline-flex h-9 items-center gap-1 rounded-full border border-border bg-card px-1.5", className)}
      >
        {OPTIONS.map((o) => (
          <span key={o.key} className="flex size-7 items-center justify-center rounded-full text-muted-foreground">
            <o.Icon className="size-4" />
          </span>
        ))}
      </div>
    )
  }

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn("inline-flex h-9 items-center gap-1 rounded-full border border-border bg-card p-1.5", className)}
    >
      {OPTIONS.map((o) => {
        const active = theme === o.key
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => setTheme(o.key)}
            aria-label={`${o.label} theme`}
            aria-pressed={active}
            title={`${o.label} theme`}
            className={cn(
              "flex size-7 items-center justify-center rounded-full transition-all",
              active
                ? "bg-gradient-to-r from-[#00f2fe] via-[#8b5cf6] to-[#fe2c55] text-white shadow-md shadow-[#fe2c55]/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <o.Icon className="size-4" />
          </button>
        )
      })}
    </div>
  )
}
