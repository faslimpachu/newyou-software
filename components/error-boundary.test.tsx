import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '@/components/error-boundary'

function Bad() {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('renders fallback on error', () => {
    render(
      <ErrorBoundary>
        <Bad />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Something went wrong.')).toBeDefined()
  })
})
