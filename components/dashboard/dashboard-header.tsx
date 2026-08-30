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
    <aside className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#f6e9df] bg-white/85 px-4 py-3 backdrop-blur-xl md:h-screen md:w-64 md:shrink-0 md:flex-col md:flex-nowrap md:items-stretch md:justify-between md:gap-y-4 md:border-r md:border-b-0 md:px-4 md:py-6">
      <div className="flex items-center md:w-full">
        <Logo href="/dashboard" />
      </div>
      <nav
        aria-label="Dashboard"
        className="flex w-full items-center gap-1 overflow-x-auto md:flex-col md:items-stretch md:gap-1.5"
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            aria-current={current === item.href ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all md:rounded-xl md:px-3",
              current === item.href
                ? "bg-gradient-to-r from-[#FFC7D8] to-[#FF8FA3]/80 text-[#7A2E3E] shadow-md shadow-[#FF8FA3]/30"
                : "text-[#8C8078] hover:bg-[#FFF1E0] hover:text-[#4A3F3A]"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3 md:w-full md:flex-col md:items-stretch">
        <span className="hidden min-w-0 truncate text-sm text-muted-foreground md:block">
          {email}
        </span>
        <ThemeToggle />
          <SignOutButton />
      </div>
    </aside>
  )
}
