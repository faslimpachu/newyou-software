"use client"

import * as React from "react"
import { Combobox, type ComboboxRootProps } from "@base-ui/react/combobox"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SearchableSelectProps extends Omit<ComboboxRootProps<string>, "onValueChange"> {
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  renderValue?: (value: string) => React.ReactNode
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

function SearchableSelect({
  value,
  onValueChange,
  placeholder = "Select",
  searchPlaceholder = "Search...",
  emptyText = "No results found",
  renderValue,
  children,
  className,
  disabled,
  ...props
}: SearchableSelectProps) {
  const handleValueChange = React.useCallback(
    (newValue: string | null, _eventDetails: unknown) => {
      if (newValue !== null && onValueChange) {
        onValueChange(newValue)
      }
    },
    [onValueChange]
  )

  return (
    <div className={cn("relative", className)}>
      <Combobox.Root
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
        {...props}
      >
      <Combobox.Trigger render={<Button variant="outline" size="sm" className="w-full justify-between" />}>
        {renderValue && value ? renderValue(value) : <Combobox.Value placeholder={placeholder} />}
        <Combobox.Icon render={<ChevronDownIcon className="size-4 opacity-50" />} />
      </Combobox.Trigger>

      <Combobox.Portal>
        <Combobox.Positioner className="z-50">
          <Combobox.Popup className="w-(--anchor-width) rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
            <div className="p-1">
              <Combobox.Input
                placeholder={searchPlaceholder}
                className="h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <Combobox.List className="max-h-60 overflow-y-auto p-1">
              <Combobox.Empty className="px-2 py-1.5 text-sm text-muted-foreground">
                {emptyText}
              </Combobox.Empty>
              {children}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
    </div>
  )
}

interface SearchableSelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

function SearchableSelectItem({ value, children, className }: SearchableSelectItemProps) {
  return (
    <Combobox.Item
      value={value}
      className={cn(
        "flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        className
      )}
    >
      {children}
    </Combobox.Item>
  )
}

export { SearchableSelect, SearchableSelectItem }
