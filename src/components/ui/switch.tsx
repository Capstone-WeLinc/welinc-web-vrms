import * as React from "react"
import { cn } from "@/lib/utils"
import { Switch as SwitchPrimitive } from "radix-ui"

/*
  Suite spec 0016 AC-9: 44 by 26px with a white 20px knob. On is a navy track; off is a muted track
  whose 1px input border gives the 3:1 edge. Never gold. `touch` grows the hit area to 44px tall on
  field role screens without changing the look. The knob moves over --duration-fold, instantly with
  reduced motion.
*/
function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "default" | "touch"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex h-6.5 w-11 shrink-0 items-center rounded-full border transition-colors duration-(--duration-fold) ease-enter outline-none motion-reduce:transition-none",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:border-input data-[state=unchecked]:bg-muted",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[size=touch]:after:absolute data-[size=touch]:after:-inset-y-2.25 data-[size=touch]:after:inset-x-0",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 translate-x-0.5 rounded-full bg-card shadow-card transition-transform duration-(--duration-fold) ease-enter motion-reduce:transition-none data-[state=checked]:translate-x-5"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
