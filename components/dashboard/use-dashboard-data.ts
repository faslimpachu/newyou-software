'use client'

import { useEffect, useState } from 'react'

export interface DashboardStats {
  registrations: number
  visits: number
  totalPatients: number
  nutritionPatients: number
  ayurcarePatients: number
  revenueToday: number
  pendingBills: number
}

export interface DashboardChartData {
  monthlyRegistrations: { month: string; registrations: number }[]
  consultationTypes: { type: string; value: number; fill: string }[]
  monthlyRevenue: { month: string; revenue: number; expenses: number }[]
}

export interface DashboardData {
  stats: DashboardStats
  monthlyRegistrations: { month: string; registrations: number }[]
  consultationTypes: { type: string; value: number; fill: string }[]
  monthlyRevenue: { month: string; revenue: number; expenses: number }[]
}

export function useDashboardData(pollInterval = 3000) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard')
        if (!res.ok) throw new Error('Failed to load dashboard data')
        const json = await res.json()
        if (mounted) {
          setData(json)
          setError(null)
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load dashboard data')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchData()
    const timer = setInterval(fetchData, pollInterval)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [pollInterval])

  return { data, loading, error }
}
