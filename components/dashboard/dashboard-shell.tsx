'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { SidebarNav } from './sidebar-nav'
import { Topbar } from './topbar'

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<{ name: string; role: string } | null>(null)

  useEffect(() => {
    let mounted = true

    const loadUser = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) return
        const data = await res.json()
        if (mounted && data.user) {
          setUser({ name: data.user.name, role: data.user.role })
        }
      } catch {
        // ignore
      }
    }

    loadUser()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="min-h-svh bg-background" suppressHydrationWarning>
      {/* Fixed desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden border-r border-sidebar-border transition-[width] duration-200 md:block',
          collapsed ? 'w-[76px]' : 'w-64',
        )}
      >
        <SidebarNav collapsed={collapsed} role={user?.role} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav onNavigate={() => setMobileOpen(false)} role={user?.role} />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div
        className={cn(
          'flex min-h-svh flex-col transition-[padding] duration-200',
          collapsed ? 'md:pl-[76px]' : 'md:pl-64',
        )}
      >
        <Topbar
          onToggleCollapse={() => setCollapsed((v) => !v)}
          onOpenMobile={() => setMobileOpen(true)}
          user={user || undefined}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
