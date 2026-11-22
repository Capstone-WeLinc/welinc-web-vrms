import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/*
  Suite spec 0016 AC-15 (design.md, Components: RoleChip): one neutral chip whatever the role,
  primary text at text-caption 600, rounded-md, 24px tall. A built in role is filled (info-bg),
  a custom role outlined (white with a 1px border), where the screen needs to tell them apart.
*/
function RoleChip({
  children,
  custom = false,
  className,
}: {
  children: ReactNode
  custom?: boolean
  className?: string
}) {
  return (
    <span
      data-slot="role-chip"
      data-custom={custom || undefined}
      className={cn(
        "inline-flex h-6 max-w-full shrink-0 items-center truncate rounded-md px-2 text-caption font-semibold whitespace-nowrap text-primary",
        custom ? "border border-border bg-card" : "border border-transparent bg-info-bg",
        className
      )}
    >
      {children}
    </span>
  )
}

export { RoleChip }
