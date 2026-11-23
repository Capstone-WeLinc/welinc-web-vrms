import * as React from "react"
import { cn } from "@/lib/utils"
import { Tabs as TabsPrimitive } from "radix-ui"

/*
  Suite spec 0016 AC-8: the selected tab has foreground text and a 2px navy underline; the rest are
  muted-strong. Tab content fades in and rises 4px over --duration-tab (a fade only with reduced motion).
*/
function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn("group/tabs flex gap-3 data-[orientation=horizontal]:flex-col", className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "group/tabs-list inline-flex w-fit max-w-full items-center gap-4 overflow-x-auto text-muted-strong",
        "group-data-[orientation=horizontal]/tabs:h-10 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col group-data-[orientation=vertical]/tabs:items-stretch group-data-[orientation=vertical]/tabs:gap-1",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-full shrink-0 items-center justify-center gap-1.5 rounded-md px-1 text-body font-medium whitespace-nowrap text-muted-strong transition-colors outline-none hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "data-[state=active]:font-semibold data-[state=active]:text-foreground",
        "after:absolute after:rounded-full after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100",
        "group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-0 group-data-[orientation=horizontal]/tabs:after:h-0.5",
        "group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start group-data-[orientation=vertical]/tabs:py-2 group-data-[orientation=vertical]/tabs:pl-3 group-data-[orientation=vertical]/tabs:after:inset-y-1 group-data-[orientation=vertical]/tabs:after:left-0 group-data-[orientation=vertical]/tabs:after:w-0.5",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-(--duration-tab) data-[state=active]:ease-enter",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
