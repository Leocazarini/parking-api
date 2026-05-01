import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { getAccessToken } from '../api/client'
import type { YardUpdate, ActiveEntry } from '../types'

interface SocketState {
  occupied: number
  vehicles: ActiveEntry[]
  connected: boolean
}

export function useYardSocket(initialVehicles: ActiveEntry[] = []) {
  const socketRef = useRef<Socket | null>(null)
  const [state, setState] = useState<SocketState>({
    occupied: initialVehicles.length,
    vehicles: initialVehicles,
    connected: false,
  })

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL ?? '', {
      auth: { token: getAccessToken() },
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => setState((s) => ({ ...s, connected: true })))
    socket.on('disconnect', () => setState((s) => ({ ...s, connected: false })))

    socket.on('yard:update', (data: YardUpdate) => {
      setState({ occupied: data.occupied, vehicles: data.vehicles, connected: true })
    })

    socket.emit('join', 'yard')

    return () => {
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    setState((s) => ({ ...s, occupied: initialVehicles.length, vehicles: initialVehicles }))
  }, [initialVehicles])

  return state
}
