import { api } from './client'
import type {
  Subscriber,
  SubscriberDetail,
  SubscriberVehicle,
  SubscriberPayment,
} from '../types'

export async function getSubscribers(): Promise<Subscriber[]> {
  const { data } = await api.get<Subscriber[]>('/subscribers')
  return data
}

export async function getSubscriber(id: number): Promise<SubscriberDetail> {
  const { data } = await api.get<SubscriberDetail>(`/subscribers/${id}`)
  return data
}

export interface SubscriberAddress {
  zip_code?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
}

export async function createSubscriber(payload: {
  name: string
  cpf: string
  phone?: string
  email?: string
  due_day: number
} & SubscriberAddress): Promise<Subscriber> {
  const { data } = await api.post<Subscriber>('/subscribers', payload)
  return data
}

export async function updateSubscriber(
  id: number,
  payload: { name?: string; phone?: string; email?: string; due_day?: number } & SubscriberAddress
): Promise<Subscriber> {
  const { data } = await api.put<Subscriber>(`/subscribers/${id}`, payload)
  return data
}

export async function deleteSubscriber(id: number): Promise<void> {
  await api.delete(`/subscribers/${id}`)
}

export async function reactivateSubscriber(id: number): Promise<SubscriberDetail> {
  const { data } = await api.patch<SubscriberDetail>(`/subscribers/${id}/reactivate`)
  return data
}

export async function getSubscriberVehicles(id: number): Promise<SubscriberVehicle[]> {
  const { data } = await api.get<SubscriberVehicle[]>(`/subscribers/${id}/vehicles`)
  return data
}

export async function addSubscriberVehicle(
  subscriberId: number,
  payload: { plate: string; model_id?: number; color_id?: number }
): Promise<SubscriberVehicle> {
  const { data } = await api.post<SubscriberVehicle>(
    `/subscribers/${subscriberId}/vehicles`,
    payload
  )
  return data
}

export async function removeSubscriberVehicle(
  subscriberId: number,
  vehicleId: number
): Promise<void> {
  await api.delete(`/subscribers/${subscriberId}/vehicles/${vehicleId}`)
}

export async function registerSubscriberPayment(
  subscriberId: number,
  payload: {
    amount: number
    reference_month: string
    payment_date: string
    payment_method: string
    notes?: string
  }
): Promise<SubscriberPayment> {
  const { data } = await api.post<SubscriberPayment>(
    `/subscribers/${subscriberId}/payments`,
    payload
  )
  return data
}

export async function getSubscriberPayments(id: number): Promise<SubscriberPayment[]> {
  const { data } = await api.get<SubscriberPayment[]>(`/subscribers/${id}/payments`)
  return data
}

export async function runOverdueCheck(): Promise<{ checked: number; marked_overdue: number }> {
  const { data } = await api.post('/subscribers/jobs/check-overdue')
  return data
}
