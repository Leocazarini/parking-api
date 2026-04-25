import { api } from './client'
import type { Color, VehicleModel } from '../types'

export async function getColors(): Promise<Color[]> {
  const { data } = await api.get<Color[]>('/catalog/colors')
  return data
}

export async function getModels(): Promise<VehicleModel[]> {
  const { data } = await api.get<VehicleModel[]>('/catalog/models')
  return data
}

export async function createColor(name: string): Promise<Color> {
  const { data } = await api.post<Color>('/catalog/colors', { name })
  return data
}

export async function updateColor(id: number, name: string): Promise<Color> {
  const { data } = await api.put<Color>(`/catalog/colors/${id}`, { name })
  return data
}

export async function deleteColor(id: number): Promise<void> {
  await api.delete(`/catalog/colors/${id}`)
}

export async function createModel(name: string): Promise<VehicleModel> {
  const { data } = await api.post<VehicleModel>('/catalog/models', { name })
  return data
}

export async function updateModel(id: number, name: string): Promise<VehicleModel> {
  const { data } = await api.put<VehicleModel>(`/catalog/models/${id}`, { name })
  return data
}

export async function deleteModel(id: number): Promise<void> {
  await api.delete(`/catalog/models/${id}`)
}
