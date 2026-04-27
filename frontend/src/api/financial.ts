import { api } from './client'
import type { RevenueResponse, DailyRevenueItem, ParkingSummary, SubscriberRevenue, HourlyRevenueItem, OverdueSubscriberItem, MonthPaymentDetail } from '../types'

export async function getRevenue(startDate: string, endDate: string): Promise<RevenueResponse> {
  const { data } = await api.get<RevenueResponse>('/api/financial/revenue', {
    params: { start_date: startDate, end_date: endDate },
  })
  return data
}

export async function getDailyRevenue(month: string): Promise<DailyRevenueItem[]> {
  const { data } = await api.get<DailyRevenueItem[]>('/api/financial/revenue/daily', {
    params: { month },
  })
  return data
}

export async function getParkingSummary(
  startDate: string,
  endDate: string
): Promise<ParkingSummary> {
  const { data } = await api.get<ParkingSummary>('/api/financial/parking-summary', {
    params: { start_date: startDate, end_date: endDate },
  })
  return data
}

export async function getSubscriberRevenue(month: string): Promise<SubscriberRevenue> {
  const { data } = await api.get<SubscriberRevenue>('/api/financial/subscribers/revenue', {
    params: { month },
  })
  return data
}

export async function getHourlyRevenue(refDate: string): Promise<HourlyRevenueItem[]> {
  const { data } = await api.get<HourlyRevenueItem[]>('/api/financial/revenue/hourly', {
    params: { ref_date: refDate },
  })
  return data
}

export async function getOverdueSubscribersList(): Promise<OverdueSubscriberItem[]> {
  const { data } = await api.get<OverdueSubscriberItem[]>('/api/financial/subscribers/overdue-list')
  return data
}

export async function getMonthPaymentsList(month: string): Promise<MonthPaymentDetail[]> {
  const { data } = await api.get<MonthPaymentDetail[]>('/api/financial/subscribers/payments-list', {
    params: { month },
  })
  return data
}
