import { api } from './client'
import type { RevenueResponse, DailyRevenueItem, ParkingSummary, SubscriberRevenue } from '../types'

export async function getRevenue(startDate: string, endDate: string): Promise<RevenueResponse> {
  const { data } = await api.get<RevenueResponse>('/financial/revenue', {
    params: { start_date: startDate, end_date: endDate },
  })
  return data
}

export async function getDailyRevenue(month: string): Promise<DailyRevenueItem[]> {
  const { data } = await api.get<DailyRevenueItem[]>('/financial/revenue/daily', {
    params: { month },
  })
  return data
}

export async function getParkingSummary(
  startDate: string,
  endDate: string
): Promise<ParkingSummary> {
  const { data } = await api.get<ParkingSummary>('/financial/parking-summary', {
    params: { start_date: startDate, end_date: endDate },
  })
  return data
}

export async function getSubscriberRevenue(month: string): Promise<SubscriberRevenue> {
  const { data } = await api.get<SubscriberRevenue>('/financial/subscribers/revenue', {
    params: { month },
  })
  return data
}
