import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

/*
  Suite spec 0016 AC-14 (design.md, Components: StatCard, board K15): an uppercase caption, a
  large mono number, a gold "Needs you" tag beside it when the count is hot (never on 0), and one
  context line. The whole card is one link to the list behind the number, already filtered. No
  icon. The period comes from the page's filter, never written on the card.
*/
function StatCard({
  caption,
  value,
  href,
  hot = false,
  context,
  className,
}: {
  caption: string
  value: ReactNode
  /** The list behind the number, with the card's filter (and the page's filters) in the URL. */
  href: string
  /** The count waits on the viewer's own role (the system's hot list). Ignored when the value is 0. */
  hot?: boolean
  context?: ReactNode
  className?: string
}) {
  const showHot = hot && value !== 0
  return (
    <Link
      to={href}
      data-slot="stat-card"
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-2xl border border-transparent bg-card p-4 text-card-foreground shadow-card transition-shadow duration-(--duration-menu) ease-enter outline-none hover:shadow-pop focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none md:p-5",
        className
      )}
    >
      <span className="text-label text-muted-strong">{caption}</span>
      <span className="flex flex-wrap items-center gap-2.5">
        <span className="font-mono text-display font-semibold">{value}</span>
        {showHot && (
          <span className="rounded-full bg-highlight px-2 py-0.5 text-caption font-semibold text-highlight-foreground">
            Needs you
          </span>
        )}
      </span>
      {context && <span className="text-small text-muted-foreground">{context}</span>}
    </Link>
  )
}

export { StatCard }
