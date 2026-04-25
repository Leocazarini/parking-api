import { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Clock, Banknote, CreditCard, Smartphone, CheckCircle, Car } from 'lucide-react'
import { getActiveEntries, registerExit, getConfig } from '../api/parking'
import { useToast } from '../hooks/useToast'
import { StatusBadge } from '../components/StatusBadge'
import type { ActiveEntry, ParkingConfig, ExitResponse, PaymentMethod } from '../types'

const COLOR_MAP: Record<string, string> = {
  Branco: '#F8F9FA', Prata: '#9CA3AF', Preto: '#1F2937', Cinza: '#6B7280',
  Vermelho: '#EF4444', Azul: '#3B82F6', Verde: '#10B981', Amarelo: '#F59E0B',
  Laranja: '#F97316', Marrom: '#92400E', Bege: '#D4B896', Vinho: '#7C3040',
  Dourado: '#D97706', Rosa: '#EC4899', Lilás: '#A78BFA',
}

const PAYMENT_OPTS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'credito',  label: 'Crédito',  icon: CreditCard },
  { value: 'debito',   label: 'Débito',   icon: CreditCard },
  { value: 'pix',      label: 'PIX',      icon: Smartphone },
]

function calcCharge(entryAt: string, config: ParkingConfig): number {
  const mins = (Date.now() - new Date(entryAt).getTime()) / 60000
  if (mins <= config.tolerance_minutes) return 0
  const hours = mins / 60
  const charged = hours * Number(config.hourly_rate)
  return Math.min(charged, Number(config.daily_rate))
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function durationStr(entryAt: string): string {
  const ms = Date.now() - new Date(entryAt).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export default function Exit() {
  const location = useLocation()
  const { toast } = useToast()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ActiveEntry | null>(null)
  const [payment, setPayment] = useState<PaymentMethod | null>(null)
  const [result, setResult] = useState<ExitResponse | null>(null)

  const { data: vehicles = [], isLoading } = useQuery<ActiveEntry[]>({
    queryKey: ['active-entries'],
    queryFn: getActiveEntries,
    staleTime: 10_000,
  })

  const { data: config } = useQuery<ParkingConfig>({
    queryKey: ['parking-config'],
    queryFn: getConfig,
    staleTime: 300_000,
  })

  // Pre-select from Yard navigation
  const stateEntryId = (location.state as { entryId?: number } | null)?.entryId
  useState(() => {
    if (stateEntryId && vehicles.length > 0) {
      const v = vehicles.find((x) => x.id === stateEntryId)
      if (v) setSelected(v)
    }
  })

  const mutation = useMutation({
    mutationFn: ({ entry_id, method }: { entry_id: number; method: PaymentMethod }) =>
      registerExit(entry_id, method),
    onSuccess: (data) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ['active-entries'] })
      toast(`Saída registrada: ${data.plate}`, 'success')
    },
  })

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase()
    if (!q) return vehicles
    const numQ = q.replace(/\D/g, '')
    return vehicles.filter((v) =>
      v.plate.includes(q) || (numQ && v.id.toString().includes(numQ))
    )
  }, [vehicles, search])

  const charge = selected && config ? calcCharge(selected.entry_at, config) : null
  const isFree = selected?.client_type === 'subscriber' || (charge !== null && charge === 0)

  const handleConfirm = () => {
    if (!selected) return
    if (!isFree && !payment) return
    mutation.mutate({ entry_id: selected.id, method: payment ?? 'dinheiro' })
  }

  const handleNew = () => {
    setResult(null)
    setSelected(null)
    setPayment(null)
    setSearch('')
    qc.invalidateQueries({ queryKey: ['active-entries'] })
  }

  if (result) {
    return (
      <div className="page">
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--green-bg)', border: '2px solid var(--green-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <CheckCircle size={32} color="var(--green)" />
            </div>

            <div className="vehicle-plate" style={{ fontSize: 28, marginBottom: 16 }}>{result.plate}</div>

            <div className="charge-display mb-16">
              <div className="charge-label">Total cobrado</div>
              <div className={`charge-amount ${Number(result.amount_charged) === 0 ? 'free' : ''}`}>
                {formatBRL(Number(result.amount_charged))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
              <div className="card" style={{ padding: '12px', textAlign: 'center' }}>
                <div className="stat-label">Duração</div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                  {durationStr(result.entry_at)}
                </div>
              </div>
              <div className="card" style={{ padding: '12px', textAlign: 'center' }}>
                <div className="stat-label">Pagamento</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>
                  {result.payment_method}
                </div>
              </div>
            </div>

            <button className="btn btn-primary btn-lg w-full" onClick={handleNew}>
              Registrar Nova Saída
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="page-header" style={{ marginBottom: 16 }}>
          <div>
            <div className="page-title">Registrar Saída</div>
            <div className="page-subtitle">Selecione o veículo e confirme o pagamento</div>
          </div>
        </div>

        {!selected ? (
          <>
            <div className="search-bar mb-12">
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar por placa ou nº do ticket…"
                value={search}
                onChange={(e) => setSearch(e.target.value.toUpperCase())}
                autoCapitalize="characters"
                autoComplete="off"
              />
            </div>

            {isLoading ? (
              <div className="loading-center">
                <div className="spinner" />
                Carregando veículos…
              </div>
            ) : vehicles.length === 0 ? (
              <div className="empty-state">
                <Car size={48} />
                <div className="empty-state-title">Pátio vazio</div>
                <div className="empty-state-sub">Nenhum veículo para registrar saída</div>
              </div>
            ) : (
              <div className="vehicle-list">
                <div className="vehicle-list-header">
                  <span>Placa</span>
                  <span>Cor / Modelo</span>
                  <span>Tipo</span>
                  <span>Tempo</span>
                </div>
                {filtered.map((v) => {
                  const dotColor = COLOR_MAP[v.color] ?? '#6B7280'
                  const rowClass = v.subscriber_status === 'overdue'
                    ? 'overdue'
                    : v.client_type === 'subscriber' ? 'subscriber' : 'regular'
                  return (
                    <div key={v.id} className={`vehicle-row ${rowClass}`} onClick={() => setSelected(v)} style={{ cursor: 'pointer' }}>
                      <span className="vr-plate">{v.plate}</span>
                      <span className="vr-details">
                        <span className="vr-color">
                          <span className="color-dot" style={{ background: dotColor }} />
                          {v.color}
                        </span>
                        {v.model && <span className="vr-model"><Car size={11} />{v.model}</span>}
                      </span>
                      <span className="vr-badges">
                        <StatusBadge status={v.client_type} />
                        {v.subscriber_status === 'overdue' && <StatusBadge status="overdue" />}
                      </span>
                      <span className="vr-duration"><Clock size={11} />{durationStr(v.entry_at)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Selected vehicle */}
            <div className="card selected" style={{ border: '1px solid var(--amber-border)', background: 'var(--amber-bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="vehicle-plate" style={{ fontSize: 26, color: 'var(--amber)' }}>
                    {selected.plate}
                  </div>
                  <div className="vehicle-meta" style={{ marginTop: 6 }}>
                    <span className="vehicle-meta-item">{selected.color}</span>
                    {selected.model && <span className="vehicle-meta-item">{selected.model}</span>}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <StatusBadge status={selected.client_type} />
                    {selected.subscriber_status && selected.subscriber_status !== 'active' && (
                      <StatusBadge status={selected.subscriber_status} />
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="stat-label">Permanência</div>
                  <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                    {durationStr(selected.entry_at)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    desde {new Date(selected.entry_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>

            {/* Charge */}
            {config && (
              <div className="charge-display">
                <div className="charge-label">
                  {selected.client_type === 'subscriber' ? 'Mensalista — Cobrança' : 'Valor a cobrar'}
                </div>
                <div className={`charge-amount ${isFree ? 'free' : ''}`}>
                  {isFree ? 'GRÁTIS' : charge !== null ? formatBRL(charge) : '—'}
                </div>
                {!isFree && charge !== null && (
                  <div className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
                    R$ {config.hourly_rate}/h · máx. R$ {config.daily_rate}
                  </div>
                )}
              </div>
            )}

            {/* Payment method (skip if free) */}
            {!isFree && (
              <div>
                <div className="form-label mb-8" style={{ display: 'block' }}>Forma de Pagamento</div>
                <div className="payment-grid">
                  {PAYMENT_OPTS.map((opt) => {
                    const Icon = opt.icon
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`payment-btn ${payment === opt.value ? 'selected' : ''}`}
                        onClick={() => setPayment(opt.value)}
                      >
                        <Icon size={22} />
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-secondary"
                onClick={() => { setSelected(null); setPayment(null) }}
                style={{ flex: '0 0 auto' }}
              >
                Voltar
              </button>
              <button
                className="btn btn-primary btn-xl"
                style={{ flex: 1 }}
                disabled={(!isFree && !payment) || mutation.isPending}
                onClick={handleConfirm}
              >
                {mutation.isPending ? (
                  <><div className="spinner" style={{ width: 20, height: 20 }} /> Registrando…</>
                ) : 'CONFIRMAR SAÍDA'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
