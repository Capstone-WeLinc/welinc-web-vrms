import * as React from "react"
import { cn } from "@/lib/utils"

/*
  Suite spec 0016 AC-8 (design.md, Components): a switch between views or filters, replacing
  toggle-group. A role="group" of buttons with aria-pressed, 40px tall with 34px pills inside a
  3px track padding. The selected pill is white with a soft ring and shadow (shadow-segment) and
  primary text at 600; the rest are muted-strong at 500. It scrolls sideways when it overflows.
  Pressing the chosen option again keeps it (a filter is never empty).
*/
type SegmentedContextValue = {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

const SegmentedContext = React.createContext<SegmentedContextValue | null>(null)

function SegmentedControl({
  value,
  onValueChange,
  disabled,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
}) {
  const context = React.useMemo(() => ({ value, onValueChange, disabled }), [value, onValueChange, disabled])
  return (
    <div
      role="group"
      data-slot="segmented-control"
      className={cn(
        "inline-flex h-10 max-w-full shrink-0 items-center gap-0.5 overflow-x-auto rounded-lg bg-track p-0.75",
        className
      )}
      {...props}
    >
      <SegmentedContext.Provider value={context}>{children}</SegmentedContext.Provider>
    </div>
  )
}

function SegmentedControlItem({
  value,
  className,
  disabled,
  onClick,
  ...props
}: Omit<React.ComponentProps<"button">, "value"> & { value: string }) {
  const context = React.useContext(SegmentedContext)
  const selected = context?.value === value
  return (
    <button
      type="button"
      data-slot="segmented-control-item"
      data-state={selected ? "on" : "off"}
      aria-pressed={selected}
      disabled={disabled || context?.disabled}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented && !selected) context?.onValueChange(value)
      }}
      className={cn(
        "inline-flex h-full shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-body font-medium whitespace-nowrap text-muted-strong transition-colors duration-(--duration-press) ease-enter outline-none hover:text-foreground motion-reduce:transition-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-track",
        "data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-primary data-[state=on]:shadow-segment",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

export { SegmentedControl, SegmentedControlItem }
