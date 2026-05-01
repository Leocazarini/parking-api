import { api } from './client'
import type { Color, VehicleModel } from '../types'

export async function getColors(): Promise<Color[]> {
  const { data } = await api.get<Color[]>('/api/catalog/colors')
  return data
}

export async function getModels(): Promise<VehicleModel[]> {
  const { data } = await api.get<VehicleModel[]>('/api/catalog/models')
  return data
}

export async function createColor(name: string): Promise<Color> {
  const { data } = await api.post<Color>('/api/catalog/colors', { name })
  return data
}

export async function updateColor(id: number, name: string): Promise<Color> {
  const { data } = await api.put<Color>(`/api/catalog/colors/${id}`, { name })
  return data
}

export async function deleteColor(id: number): Promise<void> {
  await api.delete(`/api/catalog/colors/${id}`)
}

export async function createModel(name: string): Promise<VehicleModel> {
  const { data } = await api.post<VehicleModel>('/api/catalog/models', { name })
  return data
}

export async function updateModel(id: number, name: string): Promise<VehicleModel> {
  const { data } = await api.put<VehicleModel>(`/api/catalog/models/${id}`, { name })
  return data
}

export async function deleteModel(id: number): Promise<void> {
  await api.delete(`/api/catalog/models/${id}`)
}
