import type { ReactNode } from "react"
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type ToastKind = "success" | "error" | "info" | "warning"

const ICONS = {
  success: { Icon: CheckCircle2, tile: "bg-success-bg text-success" },
  info: { Icon: Info, tile: "bg-info-bg text-primary" },
  warning: { Icon: AlertTriangle, tile: "bg-warning-bg text-warning" },
  error: { Icon: XCircle, tile: "bg-error-bg text-error" },
} as const

/*
  Suite spec 0016 AC-11 (design.md, Feedback: Toasts): our own toast, rendered through sonner's
  toast.custom (sonner keeps the stacking and the swipe). 380px wide (full width minus 16px on
  phones), rounded-xl on shadow-pop, a 24px round icon on its status tint, a title, an optional one
  line body, an optional action and a close button. Success and info show a thin bar for the time
  left, which pauses while the toaster is hovered (index.css). Errors use role="alert".
  Suite spec 0019, AC-25: `persistent` is the variant with no close button and no time bar (the
  session warning); its body may hold live parts, and `announce={false}` lets the caller speak
  through its own line so a ticking time stays silent.
*/
function Toast({
  kind,
  title,
  body,
  action,
  durationMs,
  onClose,
  persistent = false,
  announce = true,
}: {
  kind: ToastKind
  title: string
  body?: ReactNode
  /** `keepOpen`: the toast stays after the click (it closes when the caller says so). */
  action?: { label: string; onClick: () => void; loading?: boolean; keepOpen?: boolean }
  /** Shows the time left bar over this many ms; leave out for none. */
  durationMs?: number
  onClose: () => void
  /** No close button and no time bar: it stays until the caller dismisses it. */
  persistent?: boolean
  /** False drops the toast's own live region role (the caller announces instead). */
  announce?: boolean
}) {
  const { Icon, tile } = ICONS[kind]
  return (
    <div
      data-slot="toast"
      data-kind={kind}
      role={announce ? (kind === "error" ? "alert" : "status") : undefined}
      className="relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-transparent bg-card p-3 text-card-foreground shadow-pop md:w-95"
    >
      <span aria-hidden="true" className={cn("mt-px flex size-6 shrink-0 items-center justify-center rounded-full", tile)}>
        <Icon className="size-3.5" strokeWidth={2.5} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <p className="text-body font-semibold break-words">{title}</p>
        {body && <p className={cn("text-small text-muted-foreground", !persistent && "truncate")}>{body}</p>}
        {action && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              loading={action.loading}
              onClick={() => {
                action.onClick()
                if (!action.keepOpen) onClose()
              }}
            >
              {action.label}
            </Button>
          </div>
        )}
      </div>
      {!persistent && <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="-mt-1 -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        <X aria-hidden="true" className="size-4" />
      </button>}
      {durationMs !== undefined && !persistent && (
        <span
          aria-hidden="true"
          data-slot="toast-bar"
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-toast-bar bg-primary/40"
          style={{ animationDuration: `${durationMs}ms` }}
        />
      )}
    </div>
  )
}

export { Toast }
