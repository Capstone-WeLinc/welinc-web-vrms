import { useEffect, useState } from "react"
import { ChevronUp, Minus, Plus } from "lucide-react"
import { create } from "zustand"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { InitialsTile } from "@/components/ui/initials-tile"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/** One row of the change list: a `+` or `−` tile, the item, "From → To", and its Undo. */
export type SaveBarChange = {
  id: string
  /** The page's group the item sits in ("Repairs", "Thresholds"). */
  group: string
  label: string
  kind: "added" | "removed"
  from?: string
  to?: string
  onUndo: () => void
}

/** While a bar shows, toasts sit 88px higher (design.md, Feedback: Toasts). */
export const useSaveBarShown = create<{ shown: number }>(() => ({ shown: 0 }))

const EXIT_MS = 130

/*
  Suite spec 0016 AC-13 (design.md, Saving and drafts; boards SaveBar9, SaveWidths10): a navy bar,
  640px, centered on the content it sits in, 24px above the bottom (phones: full width, 16px above
  the tab bar and the safe area). It shows on the first change and leaves when the changes are
  saved or discarded. Put it last in the scroll container that holds the edited content, and give
  that page `pb-24` so the bar never covers the last row. Drafts are `useDraft`'s job.
*/
function SaveBar({
  name,
  changes,
  subline,
  keptAt,
  people,
  onDiscard,
  onReview,
  saving = false,
}: {
  /** What is edited, for "Changes to [name]". */
  name: string
  changes: SaveBarChange[]
  /** The caller's line under the count ("Chief mechanic · affects 8 people"). */
  subline?: string
  /** Set when the changes were restored from a draft: the sub line reads "Kept from [time]". */
  keptAt?: number | null
  /** The people the changes touch, at the bottom of the change list. */
  people?: { names: string[]; text: string }
  onDiscard: () => void
  onReview: () => void
  saving?: boolean
}) {
  const open = changes.length > 0
  const [shown, setShown] = useState(open)
  const [listOpen, setListOpen] = useState(false)
  // Keeps the last rows on screen while the bar fades out.
  const [last, setLast] = useState(changes)
  if (open && last !== changes) setLast(changes)
  if (open && !shown) setShown(true)

  useEffect(() => {
    if (open) return
    const timer = setTimeout(() => setShown(false), EXIT_MS)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    useSaveBarShown.setState((state) => ({ shown: state.shown + 1 }))
    return () => useSaveBarShown.setState((state) => ({ shown: state.shown - 1 }))
  }, [open])

  if (!shown) return null
  const rows = open ? changes : last
  const added = rows.filter((row) => row.kind === "added").length
  const removed = rows.length - added
  const count = `${rows.length} unsaved ${rows.length === 1 ? "change" : "changes"}`
  const sub = keptAt ? `Kept from ${new Date(keptAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : subline

  return (
    // A zero height sticky strip: the bar hangs above it, so the page never jumps when it shows.
    <div data-slot="save-bar" className="pointer-events-none sticky bottom-save-bar z-30 h-0">
      <Popover open={open && listOpen} onOpenChange={setListOpen}>
        <PopoverAnchor asChild>
          <div
            role="region"
            aria-label={`Unsaved changes to ${name}`}
            data-state={open ? "open" : "closed"}
            className={cn(
              "pointer-events-auto absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-160 items-center gap-3 rounded-xl bg-sidebar p-2 pl-3 text-sidebar-foreground shadow-bar",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 data-[state=open]:duration-(--duration-bar) data-[state=open]:ease-enter",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-4 data-[state=closed]:duration-(--duration-bar-out) data-[state=closed]:ease-exit",
              "motion-reduce:slide-in-from-bottom-0 motion-reduce:slide-out-to-bottom-0"
            )}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left outline-none hover:bg-sidebar-hover focus-visible:ring-2 focus-visible:ring-ring-on-dark"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body font-semibold">{count}</span>
                  {sub && <span className="truncate text-caption text-sidebar-idle">{sub}</span>}
                </span>
                <ChevronUp aria-hidden="true" className="size-4 shrink-0 text-sidebar-idle" />
              </button>
            </PopoverTrigger>
            <span aria-hidden="true" className="h-8 w-px shrink-0 bg-sidebar-line" />
            <Button
              variant="outline"
              onClick={onDiscard}
              disabled={saving}
              className="border-white/40 bg-transparent text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:ring-ring-on-dark focus-visible:ring-offset-sidebar"
            >
              Discard
            </Button>
            <Button variant="commit" onClick={onReview} loading={saving}>
              {saving ? "Saving…" : "Review and save"}
            </Button>
          </div>
        </PopoverAnchor>
        <PopoverContent
          side="top"
          sideOffset={8}
          className="flex max-h-80 w-(--radix-popper-anchor-width) flex-col gap-0 p-0"
        >
          <ChangeList name={name} rows={rows} added={added} removed={removed} people={people} />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function ChangeList({
  name,
  rows,
  added,
  removed,
  people,
}: {
  name: string
  rows: SaveBarChange[]
  added: number
  removed: number
  people?: { names: string[]; text: string }
}) {
  const groups = [...new Set(rows.map((row) => row.group))]
  return (
    <>
      <div className="flex items-baseline justify-between gap-3 border-b border-divider px-4 py-3">
        <h2 className="truncate text-body font-semibold">Changes to {name}</h2>
        <span className="shrink-0 font-mono text-caption text-muted-foreground">
          +{added} −{removed}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        {groups.map((group) => (
          <section key={group} className="py-1">
            <h3 className="py-1 text-label text-muted-strong">{group}</h3>
            <ul className="flex flex-col">
              {rows
                .filter((row) => row.group === group)
                .map((row) => (
                  <ChangeRow key={row.id} row={row} />
                ))}
            </ul>
          </section>
        ))}
      </div>
      {people && people.names.length > 0 && (
        <div className="flex items-center gap-3 border-t border-divider px-4 py-3">
          <span className="flex -space-x-1.5">
            {people.names.slice(0, 4).map((person) => (
              <InitialsTile key={person} name={person} className="ring-2 ring-card" />
            ))}
          </span>
          <span className="min-w-0 truncate text-small text-muted-foreground">{people.text}</span>
        </div>
      )}
    </>
  )
}

function ChangeRow({ row }: { row: SaveBarChange }) {
  const Icon = row.kind === "added" ? Plus : Minus
  return (
    <li className="flex items-center gap-3 border-b border-divider py-2 last:border-b-0">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-6.5 shrink-0 items-center justify-center rounded-md",
          row.kind === "added" ? "bg-success-bg text-success" : "bg-error-bg text-error"
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium">
          <span className="sr-only">{row.kind === "added" ? "Added: " : "Removed: "}</span>
          {row.label}
        </span>
        {(row.from || row.to) && (
          <span className="truncate text-caption text-muted-foreground">
            {row.from && <s>{row.from}</s>}
            {row.from && row.to && " → "}
            {row.to}
          </span>
        )}
      </span>
      <Button variant="ghost" size="sm" onClick={row.onUndo} aria-label={`Undo ${row.label}`}>
        Undo
      </Button>
    </li>
  )
}

export { SaveBar }
