import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type ComboboxOption = {
  value: string
  label: string
}

type ComboboxProps = Omit<
  React.ComponentProps<"button">,
  "value" | "onChange" | "onBlur" | "children"
> & {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  /** Called when the list closes; react-hook-form uses it to mark the field touched. */
  onBlur?: () => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
}

// Searchable select for long lists (mechanics, vehicles). Short fixed lists use Select.
function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search",
  emptyText = "No match found.",
  className,
  onBlur,
  ...props
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) onBlur?.()
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          data-slot="combobox-trigger"
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 py-2 text-left text-base shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:h-10 md:text-sm",
            !selected && "text-muted-foreground",
            className
          )}
          {...props}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDownIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-0"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                >
                  {option.label}
                  <CheckIcon
                    aria-hidden="true"
                    className={cn(
                      "ml-auto",
                      option.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { Combobox, type ComboboxOption }
