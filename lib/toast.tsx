'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

type Toast = { id: number; message: string; type?: 'success' | 'error' | 'info' }
type ToastContextValue = { addToast: (message: string, type?: Toast['type']) => void }

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)
  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++counter.current
    setToasts((items) => [...items, { id, message, type }])
    setTimeout(() => setToasts((items) => items.filter((t) => t.id !== id)), 3000)
  }, [])
  return <ToastContext.Provider value={{ addToast }}>{children}<Toasts toasts={toasts} /></ToastContext.Provider>
}

function Toasts({ toasts }: { toasts: Toast[] }) {
  if (typeof window === 'undefined' || !toasts.length) return null
  return createPortal(<div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>{toasts.map((toast) => <div key={toast.id} style={{ background: toast.type === 'success' ? '#166534' : toast.type === 'error' ? '#991b1b' : '#1e293b', color: '#fff', padding: '10px 14px', borderRadius: 8, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 240 }}>{toast.message}</div>)}</div>, document.body)
}
