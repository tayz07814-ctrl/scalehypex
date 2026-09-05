import Link from "next/link"
import { ScaleHypeIcon } from "@/components/scalehype-icon"
import { cn } from "@/lib/utils"

export function Logo({
  href = "/",
  className,
  iconSize = 30,
}: {
  href?: string
  className?: string
  iconSize?: number
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5 select-none transition-opacity hover:opacity-95", className)}
    >
      <div className="relative shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-3">
        <ScaleHypeIcon size={iconSize} variant="badge" />
      </div>
      <span className="text-base font-black tracking-tight text-foreground">
        Scale<span className="text-gradient">Hypex</span>
      </span>
    </Link>
  )
}
