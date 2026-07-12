import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton, SkeletonText, SkeletonCard } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

describe('Skeleton', () => {
  it('renders skeleton block', () => {
    const { container } = render(<Skeleton className="w-10 h-10" />)
    const el = container.querySelector('.animate-pulse')
    expect(el).not.toBeNull()
  })
  it('renders skeleton text', () => {
    const { container } = render(<SkeletonText lines={2} />)
    const items = container.querySelectorAll('.animate-pulse')
    expect(items.length).toBeGreaterThanOrEqual(2)
  })
})
