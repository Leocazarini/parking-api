import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getMe, login as apiLogin, logout as apiLogout } from '../api/auth'
import { setAccessToken } from '../api/client'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) await apiLogout(refreshToken)
    } catch {
      // ignore
    }
    setAccessToken(null)
    localStorage.removeItem('refresh_token')
    setState({ user: null, isLoading: false, isAuthenticated: false })
  }, [])

  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [logout])

  useEffect(() => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      setState((s) => ({ ...s, isLoading: false }))
      return
    }

    ;(async () => {
      try {
        const { default: axios } = await import('axios')

        let refreshData: { access_token: string; refresh_token: string }
        try {
          const { data } = await axios.post('/api/auth/refresh', { refresh_token: refreshToken })
          refreshData = data
        } catch (firstErr: unknown) {
          // Token explicitamente rejeitado (4xx) — não tenta de novo
          const status = (firstErr as { response?: { status?: number } })?.response?.status
          if (status && status < 500) throw firstErr
          // Erro de rede ou servidor (5xx) — aguarda 2s e tenta uma vez mais
          await new Promise((r) => setTimeout(r, 2000))
          const { data } = await axios.post('/api/auth/refresh', { refresh_token: refreshToken })
          refreshData = data
        }

        setAccessToken(refreshData.access_token)
        localStorage.setItem('refresh_token', refreshData.refresh_token)
        const user = await getMe()
        setState({ user, isLoading: false, isAuthenticated: true })
      } catch {
        setAccessToken(null)
        localStorage.removeItem('refresh_token')
        setState({ user: null, isLoading: false, isAuthenticated: false })
      }
    })()
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const tokens = await apiLogin(username, password)
    setAccessToken(tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
    const user = await getMe()
    setState({ user, isLoading: false, isAuthenticated: true })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
