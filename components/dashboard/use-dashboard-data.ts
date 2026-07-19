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
  followupToday: number
}

export interface DashboardChartData {
  monthlyRegistrations: { month: string; registrations: number }[]
  consultationTypes: { type: string; value: number; fill: string }[]
  monthlyRevenue: { month: string; revenue: number; expenses: number }[]
}

export interface DashboardRegistration {
  mr: string
  patientName: string
  mobileNumber: string
  consultationType: string
  gender: string
  age?: number | null
  district: string
  state: string
  createdAt: string
  status?: string | null
}

export interface DashboardFollowUp {
  id: string
  patientMr: string
  program?: string | null
  reviewDate?: string | null
  dueDate?: string | null
  assignedTo?: string | null
  priority?: string | null
  status?: string | null
  remarks?: string | null
  createdAt: string
  patient?: {
    patientName?: string | null
    mobileNumber?: string | null
    district?: string | null
  } | null
}

export interface DashboardBill {
  id: number
  invoiceNumber: string
  patientName: string
  patientMrNumber: string
  center: string
  billType: string
  invoiceDate: string
  grandTotal?: number | null
  paid: number
  balance?: number | null
  paymentMethod?: string | null
  status?: string | null
  createdAt: string
}

export interface DashboardData {
  stats: DashboardStats
  monthlyRegistrations: { month: string; registrations: number }[]
  consultationTypes: { type: string; value: number; fill: string }[]
  monthlyRevenue: { month: string; revenue: number; expenses: number }[]
  recentRegistrations: DashboardRegistration[]
  upcomingFollowUps: DashboardFollowUp[]
  recentBilling: DashboardBill[]
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
