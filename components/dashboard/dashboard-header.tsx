import Link from "next/link"

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
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <Logo href="/dashboard" />
        <nav aria-label="Dashboard" className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active === item.href ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                active === item.href
                  ? "bg-gradient-to-r from-violet-500/90 to-fuchsia-500/90 text-white shadow-lg shadow-fuchsia-500/25"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
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
