"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"
import { SignOutButton } from "@/components/dashboard/sign-out-button"
import { ThemeToggle } from "@/components/theme-toggle"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/posts", label: "Posts" },
  { href: "/dashboard/comments", label: "Comments" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/settings", label: "Settings" },
] as const

export function DashboardHeader({
  email,
  active,
}: {
  email: string
  active: (typeof NAV_ITEMS)[number]["href"]
}) {
  const pathname = usePathname()
  const current =
    (pathname as (typeof NAV_ITEMS)[number]["href"] | null) ?? active

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Logo href="/dashboard" />
        <nav
          aria-label="Dashboard"
          className="flex items-center gap-1 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={current === item.href ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-all",
                current === item.href
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden max-w-52 truncate text-sm text-muted-foreground sm:block">
            {email}
          </span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}
