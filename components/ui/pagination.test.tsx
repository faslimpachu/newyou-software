import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Pagination } from '@/components/ui/pagination'

describe('Pagination', () => {
  it('renders page controls', () => {
    const onChange = () => {}
    render(<Pagination page={1} totalPages={3} onChange={onChange} />)
    expect(screen.getByText('Previous')).toBeDefined()
    expect(screen.getByText('Next')).toBeDefined()
    expect(screen.getByText('Page 1 of 3')).toBeDefined()
  })
})
