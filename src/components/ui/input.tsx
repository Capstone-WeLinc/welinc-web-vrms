import * as React from "react"
import { cn } from "@/lib/utils"
import { fieldControl, fieldReadOnly } from "@/components/ui/field-styles"

// Suite spec 0016 AC-7: 44px on phones, 40px from 768px up; focus, invalid, disabled and read only from field-styles
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 px-3 py-1 selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-body file:font-medium file:text-foreground md:h-10",
        fieldControl,
        fieldReadOnly,
        className
      )}
      {...props}
    />
  )
}

export { Input }
