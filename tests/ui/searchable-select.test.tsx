import { describe, it, expect } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { SearchableSelect, SearchableSelectItem } from '@/components/ui/searchable-select'

describe('SearchableSelect Component', () => {
  it('renders with placeholder', () => {
    render(
      <SearchableSelect placeholder="Select item">
        <SearchableSelectItem value="1">Item 1</SearchableSelectItem>
        <SearchableSelectItem value="2">Item 2</SearchableSelectItem>
      </SearchableSelect>
    )
    expect(screen.getByText('Select item')).toBeDefined()
  })

  it('opens dropdown when trigger is clicked', async () => {
    render(
      <SearchableSelect placeholder="Select item">
        <SearchableSelectItem value="1">Item 1</SearchableSelectItem>
        <SearchableSelectItem value="2">Item 2</SearchableSelectItem>
      </SearchableSelect>
    )
    const trigger = screen.getByRole('combobox')
    act(() => {
      fireEvent.click(trigger)
    })
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeDefined()
    })
    expect(screen.getByText('Item 2')).toBeDefined()
  })

  it('filters items when searching', async () => {
    render(
      <SearchableSelect placeholder="Select item" searchPlaceholder="Type to search">
        <SearchableSelectItem value="1">Apple</SearchableSelectItem>
        <SearchableSelectItem value="2">Banana</SearchableSelectItem>
        <SearchableSelectItem value="3">Cherry</SearchableSelectItem>
      </SearchableSelect>
    )
    const trigger = screen.getByRole('combobox')
    act(() => {
      fireEvent.click(trigger)
    })
    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeDefined()
    })
    const input = screen.getByPlaceholderText('Type to search')
    act(() => {
      fireEvent.change(input, { target: { value: 'zzzzz' } })
    })
    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeDefined()
    })
  })

  it('filters items by visible text when item text is split across nodes', async () => {
    render(
      <SearchableSelect placeholder="Select product" searchPlaceholder="Search product">
        <SearchableSelectItem value="p1">
          Bandages Roll <span>(CON003)</span>
        </SearchableSelectItem>
        <SearchableSelectItem value="p2">
          Gauze Pieces <span>(CON002)</span>
        </SearchableSelectItem>
      </SearchableSelect>,
    )

    fireEvent.click(screen.getByRole('combobox'))
    const input = screen.getByPlaceholderText('Search product')
    fireEvent.change(input, { target: { value: 'Bandages Roll' } })

    expect(await screen.findByText('Bandages Roll')).toBeTruthy()
    expect(screen.queryByText('Gauze Pieces')).toBeNull()
  })

  it('shows empty state when no items match', async () => {
    render(
      <SearchableSelect placeholder="Select item" emptyText="No matches">
        <SearchableSelectItem value="1">Apple</SearchableSelectItem>
      </SearchableSelect>
    )
    const trigger = screen.getByRole('combobox')
    act(() => {
      fireEvent.click(trigger)
    })
    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeDefined()
    })
    const input = screen.getByPlaceholderText('Search...')
    act(() => {
      fireEvent.change(input, { target: { value: 'xyz' } })
    })
    await waitFor(() => {
      expect(screen.getByText('No matches')).toBeDefined()
    })
  })

  it('calls onValueChange when item is selected', async () => {
    let selectedValue = ''
    const handleChange = (value: string) => {
      selectedValue = value
    }
    render(
      <SearchableSelect placeholder="Select item" onValueChange={handleChange}>
        <SearchableSelectItem value="apple">Apple</SearchableSelectItem>
        <SearchableSelectItem value="banana">Banana</SearchableSelectItem>
      </SearchableSelect>
    )
    const trigger = screen.getByRole('combobox')
    act(() => {
      fireEvent.click(trigger)
    })
    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeDefined()
    })
    act(() => {
      fireEvent.click(screen.getByText('Apple'))
    })
    expect(selectedValue).toBe('apple')
  })

  it('is disabled when disabled prop is true', () => {
    render(
      <SearchableSelect placeholder="Select item" disabled>
        <SearchableSelectItem value="1">Item 1</SearchableSelectItem>
      </SearchableSelect>
    )
    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeDisabled()
  })
})
