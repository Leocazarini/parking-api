import { api } from './client'
import type { ActiveEntry, EntryResponse, ExitResponse, ParkingConfig } from '../types'

export async function getActiveEntries(): Promise<ActiveEntry[]> {
  const { data } = await api.get<ActiveEntry[]>('/patio/ativos')
  return data
}

export async function registerEntry(placa: string, color_id: number): Promise<EntryResponse> {
  const { data } = await api.post<EntryResponse>('/patio/entrada', { placa, color_id })
  return data
}

export async function registerExit(entry_id: number, payment_method: string): Promise<ExitResponse> {
  const { data } = await api.post<ExitResponse>('/patio/saida', { entry_id, payment_method })
  return data
}

export async function getConfig(): Promise<ParkingConfig> {
  const { data } = await api.get<ParkingConfig>('/patio/config')
  return data
}

export async function updateConfig(patch: Partial<ParkingConfig>): Promise<ParkingConfig> {
  const { data } = await api.put<ParkingConfig>('/patio/config', patch)
  return data
}
