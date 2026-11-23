import { cn } from "@/lib/utils"

/*
  Suite spec 0016 (design.md, Components: Meter): a 6px track bar with a primary fill (gold when
  hot), the count beside it in mono ("11/16").
*/
function Meter({
  value,
  max,
  label,
  hot = false,
  className,
}: {
  value: number
  max: number
  /** What is counted, for screen readers ("Seats used"). */
  label: string
  hot?: boolean
  className?: string
}) {
  const share = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  return (
    <div data-slot="meter" className={cn("flex items-center gap-2", className)}>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} of ${max}`}
        className="h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-track"
      >
        <div
          className={cn("h-full rounded-full", hot ? "bg-highlight" : "bg-primary")}
          style={{ width: `${share * 100}%` }}
        />
      </div>
      <span aria-hidden="true" className="shrink-0 font-mono text-caption text-muted-strong">
        {value}/{max}
      </span>
    </div>
  )
}

export { Meter }
