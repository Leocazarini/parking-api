import { api } from './client'
import type { TokenResponse, User } from '../types'

export async function login(username: string, password: string): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>('/auth/login', { username, password })
  return data
}

export async function logout(refresh_token: string): Promise<void> {
  await api.post('/auth/logout', { refresh_token })
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/users/me')
  return data
}
