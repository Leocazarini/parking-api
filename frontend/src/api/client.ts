import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
})

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string | null) => void> = []

function processQueue(token: string | null) {
  refreshQueue.forEach((cb) => cb(token))
  refreshQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status !== 401 || original._retry) {
      if (error.response && error.response.status !== 401) {
        window.dispatchEvent(new CustomEvent('api:error', {
          detail: { status: error.response.status, data: error.response.data },
        }))
      } else if (!error.response && error.request) {
        window.dispatchEvent(new CustomEvent('api:error', {
          detail: { status: 0, data: null },
        }))
      }
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (token) {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          } else {
            reject(error)
          }
        })
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) throw new Error('No refresh token')

      const { data } = await axios.post('/auth/refresh', { refresh_token: refreshToken })
      setAccessToken(data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      processQueue(data.access_token)
      original.headers.Authorization = `Bearer ${data.access_token}`
      return api(original)
    } catch {
      processQueue(null)
      setAccessToken(null)
      localStorage.removeItem('refresh_token')
      window.dispatchEvent(new Event('auth:logout'))
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)
