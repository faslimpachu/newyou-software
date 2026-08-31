'use client'

import * as React from 'react'
import { Combobox, type ComboboxRootProps } from '@base-ui/react/combobox'
import { ChevronDownIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SearchableSelectProps extends Omit<
  ComboboxRootProps<string>,
  'onValueChange' | 'items' | 'onInputValueChange'
> {
  onValueChange?: (value: string) => void
  onInputValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  renderValue?: (value: string) => React.ReactNode
  children: React.ReactNode
  className?: string
  disabled?: boolean
  triggerAriaLabel?: string
}

type SearchableSelectChild = React.ReactElement<{
  value?: string
  children?: React.ReactNode
}>

function isSearchableSelectChild(
  child: React.ReactNode,
): child is SearchableSelectChild {
  return React.isValidElement(child)
}

function getNodeText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(getNodeText).join('')
  }
  if (isSearchableSelectChild(node)) {
    return getNodeText(node.props.children)
  }
  return ''
}

function SearchableSelect({
  value,
  onValueChange,
  onInputValueChange,
  placeholder = 'Select',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found',
  renderValue,
  children,
  className,
  disabled,
  triggerAriaLabel,
  ...props
}: SearchableSelectProps) {
  const handleValueChange = React.useCallback(
    (newValue: string | null, _eventDetails: unknown) => {
      if (newValue !== null && onValueChange) {
        onValueChange(newValue)
      }
    },
    [onValueChange],
  )

  const getItemLabel = React.useCallback(
    (child: SearchableSelectChild): string => {
      const label = getNodeText(child.props.children).trim()
      return label || child.props.value?.toString() || ''
    },
    [],
  )

  const [search, setSearch] = React.useState('')

  const filteredChildren = React.useMemo<React.ReactNode[]>(() => {
    const childArray = React.Children.toArray(children)
    if (!search) return childArray

    const lowerSearch = search.toLowerCase()
    return childArray.filter((child) => {
      if (isSearchableSelectChild(child)) {
        const label = getItemLabel(child).toLowerCase()
        const itemValue = child.props.value?.toString().toLowerCase() || ''
        return label.includes(lowerSearch) || itemValue.includes(lowerSearch)
      }
      return false
    })
  }, [children, search, getItemLabel])

  return (
    <div className={cn('relative', className)}>
      <Combobox.Root
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
        onInputValueChange={(next) => {
          setSearch(next)
          onInputValueChange?.(next)
        }}
        {...props}
      >
        <Combobox.Trigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
              aria-label={triggerAriaLabel}
            />
          }
        >
          {renderValue && value ? (
            renderValue(value)
          ) : (
            <Combobox.Value placeholder={placeholder} />
          )}
          <Combobox.Icon
            render={<ChevronDownIcon className="size-4 opacity-50" />}
          />
        </Combobox.Trigger>

        <Combobox.Portal>
          <Combobox.Positioner className="z-50">
            <Combobox.Popup className="min-w-[var(--anchor-width)] w-80 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
              <div className="p-1">
                <Combobox.Input
                  placeholder={searchPlaceholder}
                  className="h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <Combobox.List className="max-h-60 overflow-y-auto p-1">
                {filteredChildren.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {emptyText}
                  </div>
                )}
                {filteredChildren.map((child) => {
                  if (isSearchableSelectChild(child) && child.props.value) {
                    return child
                  }
                  return null
                })}
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

function SearchableSelectItem({
  value,
  children,
  className,
}: SearchableSelectItemProps) {
  return (
    <Combobox.Item
      value={value}
      className={cn(
        'flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground',
        className,
      )}
    >
      {children}
    </Combobox.Item>
  )
}

export { SearchableSelect, SearchableSelectItem }
