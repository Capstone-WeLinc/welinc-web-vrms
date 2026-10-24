import * as React from "react"
import { defaultFilter } from "cmdk"
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react"

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
  /** Secondary text after the label, such as a vehicle model. */
  description?: string
  /** A small badge at the end of the row, such as "Under repair". */
  badge?: React.ReactNode
  /** Extra search terms; the label always matches. */
  keywords?: string[]
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
  /** Offers an Add row for typed text that matches no option. Receives the trimmed text. */
  onCreate?: (text: string) => void
  createLabel?: (text: string) => string
  /** Extra check before the Add row shows, for matches the options don't hold. */
  canCreate?: (text: string) => boolean
}

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

// Stray spaces around the typed text still find the option, matching how the Add row compares.
const trimmedFilter: typeof defaultFilter = (value, search, keywords) =>
  defaultFilter(value, search.trim(), keywords)

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
  onCreate,
  createLabel = (text) => `Add "${text}"`,
  canCreate,
  ...props
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const selected = options.find((option) => option.value === value)
  // A value from the Add row is not in the options, so show it as typed.
  const display = selected ? selected.label : value

  const typed = search.trim()
  const showCreate =
    !!onCreate &&
    typed.length > 0 &&
    !options.some((option) => sameText(option.label, typed)) &&
    (canCreate?.(typed) ?? true)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setSearch("")
          onBlur?.()
        }
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
            !display && "text-muted-foreground",
            className
          )}
          {...props}
        >
          <span className="truncate">{display || placeholder}</span>
          <ChevronsUpDownIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-0"
      >
        <Command filter={trimmedFilter}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
            className="text-base md:text-sm"
          />
          <CommandList>
            {!showCreate && <CommandEmpty>{emptyText}</CommandEmpty>}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  keywords={option.keywords}
                  onSelect={() => {
                    onValueChange(option.value)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <span className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span className="truncate">{option.label}</span>
                    {option.description && (
                      <span className="truncate text-xs text-muted-foreground">{option.description}</span>
                    )}
                  </span>
                  {option.badge}
                  <CheckIcon
                    aria-hidden="true"
                    className={cn(
                      "shrink-0",
                      option.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            {showCreate && (
              // cmdk hides a group, and an item, that matches nothing; forceMount on both keeps the Add row shown.
              <CommandGroup forceMount>
                <CommandItem
                  forceMount
                  value={`__create__:${typed}`}
                  onSelect={() => {
                    onCreate(typed)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <PlusIcon aria-hidden="true" />
                  <span className="truncate">{createLabel(typed)}</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { Combobox, type ComboboxOption }
