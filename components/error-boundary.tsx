'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: unknown) { console.error('UI crash:', error) }
  render() {
    if (this.state.hasError) {
      return <div className="mx-auto max-w-[1600px] py-20 text-center"><p className="text-lg font-semibold">Something went wrong.</p><p className="mt-2 text-sm text-muted-foreground">An unexpected error occurred while rendering this page.</p><Button className="mt-4" onClick={() => this.setState({ hasError: false })}>Try again</Button></div>
    }
    return this.props.children
  }
}
