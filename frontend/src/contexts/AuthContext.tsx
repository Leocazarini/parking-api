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
        const { data } = await axios.post('/auth/refresh', { refresh_token: refreshToken })
        setAccessToken(data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
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
