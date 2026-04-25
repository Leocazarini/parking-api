import { api } from './client'
import type { User } from '../types'

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>('/users')
  return data
}

export async function createUser(payload: {
  username: string
  email: string
  password: string
  role: string
}): Promise<User> {
  const { data } = await api.post<User>('/users', payload)
  return data
}

export async function updateUser(
  id: number,
  payload: { role?: string; is_active?: boolean }
): Promise<User> {
  const { data } = await api.put<User>(`/users/${id}`, payload)
  return data
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`)
}
