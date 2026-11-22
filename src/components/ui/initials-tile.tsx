import { cn } from "@/lib/utils"
import { getInitials } from "@/lib/utils/format"

/*
  Suite spec 0016 AC-15 (design.md, Components: InitialsTile): two letters at 600 in primary on
  info-bg. Square for roles, round for people; 28px in lists, 40px in headers. Color never encodes
  a role. The name is read by whatever sits beside the tile, so the tile itself is hidden.
*/
function InitialsTile({
  name,
  shape = "round",
  size = "list",
  className,
}: {
  name: string
  shape?: "square" | "round"
  size?: "list" | "header"
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      data-slot="initials-tile"
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-info-bg font-semibold text-primary select-none",
        shape === "square" ? "rounded-md" : "rounded-full",
        size === "list" ? "size-7 text-caption" : "size-10 text-body",
        className
      )}
    >
      {getInitials(name)}
    </span>
  )
}

export { InitialsTile }
