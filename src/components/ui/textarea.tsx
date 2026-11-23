import * as React from "react"
import { cn } from "@/lib/utils"
import { fieldControl, fieldReadOnly } from "@/components/ui/field-styles"

// Suite spec 0016 AC-7: the input rules, grown to fit its text
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full px-3 py-2",
        fieldControl,
        fieldReadOnly,
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
