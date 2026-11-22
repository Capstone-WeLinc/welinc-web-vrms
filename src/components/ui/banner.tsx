import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type BannerKind = "info" | "success" | "warning" | "error"

const TILES: Record<BannerKind, string> = {
  info: "bg-info-bg text-primary",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  error: "bg-error-bg text-error",
}

/*
  Suite spec 0016 AC-12 (design.md, Feedback: Banners): a floating card, top center of the content
  area, at most 560px wide (full width minus 16px on phones), rounded-xl on shadow-pop, a 28px
  status icon tile, a title, one line and an optional action, role="status". It fades in and
  drops 8px on the toast tokens.
*/
function Banner({
  kind,
  icon: Icon,
  title,
  children,
  action,
  onClose,
  className,
}: {
  kind: BannerKind
  icon: LucideIcon
  title: string
  children?: ReactNode
  action?: { label: string; onClick: () => void; loading?: boolean }
  onClose?: () => void
  className?: string
}) {
  return (
    <div
      role="status"
      data-slot="banner"
      className={cn(
        "pointer-events-auto flex w-full max-w-140 items-start gap-3 rounded-xl border border-transparent bg-card p-3 text-card-foreground shadow-pop animate-in fade-in-0 slide-in-from-top-2 duration-(--duration-toast) ease-enter",
        className
      )}
    >
      <span aria-hidden="true" className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", TILES[kind])}>
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <p className="text-body font-semibold">{title}</p>
        {children && <div className="text-small text-muted-foreground">{children}</div>}
      </div>
      {action && (
        <Button variant="outline" size="sm" loading={action.loading} onClick={action.onClick} className="shrink-0">
          {action.label}
        </Button>
      )}
      {onClose && (
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="-mt-0.5 -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  )
}

export { Banner }
