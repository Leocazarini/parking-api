import { api } from './client'
import type { ActiveEntry, EntryResponse, ExitResponse, ParkingConfig } from '../types'

export async function getActiveEntries(): Promise<ActiveEntry[]> {
  const { data } = await api.get<ActiveEntry[]>('/api/patio/ativos')
  return data
}

export async function registerEntry(placa: string, color_id: number): Promise<EntryResponse> {
  const { data } = await api.post<EntryResponse>('/api/patio/entrada', { placa, color_id })
  return data
}

export async function registerExit(entry_id: number, payment_method: string): Promise<ExitResponse> {
  const { data } = await api.post<ExitResponse>('/api/patio/saida', { entry_id, payment_method })
  return data
}

export async function getConfig(): Promise<ParkingConfig> {
  const { data } = await api.get<ParkingConfig>('/api/patio/config')
  return data
}

export async function updateConfig(patch: Partial<ParkingConfig>): Promise<ParkingConfig> {
  const { data } = await api.put<ParkingConfig>('/api/patio/config', patch)
  return data
}
