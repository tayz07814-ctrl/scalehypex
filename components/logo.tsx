import Link from "next/link"
import { ZapIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export function Logo({
  href = "/",
  className,
}: {
  href?: string
  className?: string
}) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2", className)}>
      <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 shadow-lg shadow-fuchsia-500/40 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
        <ZapIcon className="size-4 text-white" />
      </span>
      <span className="text-base font-bold tracking-tight">
        Scale<span className="text-gradient">Hypex</span>
      </span>
    </Link>
  )
}
