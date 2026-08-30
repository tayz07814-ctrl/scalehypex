"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"
import { SignOutButton } from "@/components/dashboard/sign-out-button"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/posts", label: "Posts" },
  { href: "/dashboard/comments", label: "Comments" },
  { href: "/dashboard/terminal", label: "Terminal" },
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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <Logo href="/dashboard" />
        <nav aria-label="Dashboard" className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={current === item.href ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                current === item.href
                  ? "bg-gradient-to-r from-[#25f4ee] to-[#fe2c55] text-white shadow-lg shadow-rose-500/25"
                  : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
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
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}