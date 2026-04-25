import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { LogIn, LogOut, Search, Clock, Car } from 'lucide-react'
import { getActiveEntries } from '../api/parking'
import { useYardSocket } from '../hooks/useSocket'
import { StatusBadge } from '../components/StatusBadge'
import type { ActiveEntry } from '../types'

const COLOR_MAP: Record<string, string> = {
  Branco: '#F8F9FA', Prata: '#9CA3AF', Preto: '#1F2937', Cinza: '#6B7280',
  Vermelho: '#EF4444', Azul: '#3B82F6', Verde: '#10B981', Amarelo: '#F59E0B',
  Laranja: '#F97316', Marrom: '#92400E', Bege: '#D4B896', Vinho: '#7C3040',
  Dourado: '#D97706', Rosa: '#EC4899', Lilás: '#A78BFA',
}

function durationStr(entryAt: string): string {
  const ms = Date.now() - new Date(entryAt).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function VehicleRow({ vehicle, onClick }: { vehicle: ActiveEntry; onClick: () => void }) {
  const dotColor = COLOR_MAP[vehicle.color] ?? '#6B7280'
  const rowClass = vehicle.subscriber_status === 'overdue'
    ? 'overdue'
    : vehicle.client_type === 'subscriber' ? 'subscriber' : 'regular'

  return (
    <div className={`vehicle-row ${rowClass}`} onClick={onClick}>
      <span className="vr-plate">{vehicle.plate}</span>
      <span className="vr-details">
        <span className="vr-color">
          <span className="color-dot" style={{ background: dotColor }} />
          {vehicle.color}
        </span>
        {vehicle.model && (
          <span className="vr-model"><Car size={11} />{vehicle.model}</span>
        )}
      </span>
      <span className="vr-badges">
        <StatusBadge status={vehicle.client_type} />
        {vehicle.subscriber_status === 'overdue' && <StatusBadge status="overdue" />}
      </span>
      <span className="vr-duration">
        <Clock size={11} />
        {durationStr(vehicle.entry_at)}
      </span>
    </div>
  )
}

export default function Yard() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: initial = [] } = useQuery<ActiveEntry[]>({
    queryKey: ['active-entries'],
    queryFn: getActiveEntries,
    staleTime: 30_000,
  })

  const { occupied, vehicles, connected } = useYardSocket(initial)

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase()
    if (!q) return vehicles
    return vehicles.filter(
      (v) =>
        v.plate.includes(q) ||
        v.color.toUpperCase().includes(q) ||
        (v.model ?? '').toUpperCase().includes(q)
    )
  }, [vehicles, search])

  return (
    <div className="page">
      {/* Counter + actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 20, alignItems: 'stretch' }}>
        <div className="yard-counter">
          <div className="yard-counter-number">{occupied}</div>
          <div className="yard-counter-label">Veículos no Pátio</div>
          <div className="live-dot">{connected ? 'Ao Vivo' : 'Reconectando…'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/entry')}
            style={{ flex: 1, flexDirection: 'column', gap: 4, minWidth: 96 }}
          >
            <LogIn size={22} />
            <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 900, letterSpacing: '0.08em', fontSize: 13 }}>ENTRADA</span>
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => navigate('/exit')}
            style={{ flex: 1, flexDirection: 'column', gap: 4 }}
          >
            <LogOut size={22} />
            <span style={{ fontFamily: 'Barlow Condensed', fontWeight: 900, letterSpacing: '0.08em', fontSize: 13 }}>SAÍDA</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar mb-16">
        <Search size={16} />
        <input
          type="text"
          placeholder="Buscar por placa, cor ou modelo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
        />
      </div>

      {/* Vehicles */}
      {vehicles.length === 0 ? (
        <div className="empty-state">
          <Car size={48} />
          <div className="empty-state-title">Pátio vazio</div>
          <div className="empty-state-sub">Nenhum veículo presente no momento</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Search size={36} />
          <div className="empty-state-title">Nenhum resultado</div>
          <div className="empty-state-sub">Tente uma busca diferente</div>
        </div>
      ) : (
        <div className="vehicle-list">
          <div className="vehicle-list-header">
            <span>Placa</span>
            <span>Cor / Modelo</span>
            <span>Tipo</span>
            <span>Tempo</span>
          </div>
          {filtered.map((v) => (
            <VehicleRow
              key={v.id}
              vehicle={v}
              onClick={() => navigate('/exit', { state: { entryId: v.id } })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
