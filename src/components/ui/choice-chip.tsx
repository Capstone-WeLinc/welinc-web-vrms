import * as React from "react"
import { cn } from "@/lib/utils"

/*
  Suite spec 0016 AC-8: picking one value inside a form (a priority, an account type). The
  selected chip is solid navy with white text; the rest are white with an input border. A
  role="group" of buttons with aria-pressed, 44px on phones and 40px from 768px up. Pressing the
  chosen chip again keeps it, so the value is never emptied.
*/
type ChoiceContextValue = {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

const ChoiceContext = React.createContext<ChoiceContextValue | null>(null)

function ChoiceChipGroup({
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
    <div role="group" data-slot="choice-chip-group" className={cn("flex flex-wrap gap-2", className)} {...props}>
      <ChoiceContext.Provider value={context}>{children}</ChoiceContext.Provider>
    </div>
  )
}

function ChoiceChip({
  value,
  className,
  disabled,
  onClick,
  ...props
}: Omit<React.ComponentProps<"button">, "value"> & { value: string }) {
  const context = React.useContext(ChoiceContext)
  const selected = context?.value === value
  return (
    <button
      type="button"
      data-slot="choice-chip"
      data-state={selected ? "on" : "off"}
      aria-pressed={selected}
      disabled={disabled || context?.disabled}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented && !selected) context?.onValueChange(value)
      }}
      className={cn(
        "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-input bg-card px-4 text-body font-medium whitespace-nowrap text-foreground transition duration-(--duration-press) ease-enter outline-none hover:bg-accent active:scale-96 motion-reduce:transition-none md:h-10",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary-hover",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

export { ChoiceChipGroup, ChoiceChip }
