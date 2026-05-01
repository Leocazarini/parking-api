import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts'
import { TrendingUp, Car, Clock, Star, X, AlertTriangle, CheckCircle } from 'lucide-react'
import {
  getRevenue, getDailyRevenue, getParkingSummary, getSubscriberRevenue,
  getHourlyRevenue, getOverdueSubscribersList, getMonthPaymentsList,
} from '../api/financial'
import type {
  RevenueResponse, DailyRevenueItem, ParkingSummary, SubscriberRevenue,
  HourlyRevenueItem, OverdueSubscriberItem, MonthPaymentDetail,
} from '../types'
import { fmtDuration } from '../utils'

function fmtBRL(v: string | number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const today = new Date()
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border-light)',
      borderRadius: 8, padding: '10px 14px', fontSize: 13,
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
        {label ? new Date(label + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''}
      </div>
      <div style={{ color: 'var(--amber)', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
        {fmtBRL(payload[0].value)}
      </div>
    </div>
  )
}

const METHOD_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  dinheiro: { color: 'var(--green)',  bg: 'var(--green-bg)',  border: 'var(--green-border)'  },
  credito:  { color: 'var(--blue)',   bg: 'var(--blue-bg)',   border: 'var(--blue-border)'   },
  debito:   { color: 'var(--orange)', bg: 'var(--orange-bg)', border: 'var(--orange-border)' },
  pix:      { color: 'var(--amber)',  bg: 'var(--amber-bg)',  border: 'var(--amber-border)'  },
}

function MethodBadge({ method }: { method: string }) {
  const c = METHOD_COLORS[method] ?? METHOD_COLORS.pix
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      fontFamily: 'JetBrains Mono', color: c.color, background: c.bg,
      border: `1px solid ${c.border}`, borderRadius: 4, padding: '2px 7px',
    }}>
      {method}
    </span>
  )
}

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface-2)', border: '1px solid var(--border-light)',
          borderRadius: 16, width: '100%', maxWidth: 500,
          maxHeight: '78vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function OverdueModal({
  month, onClose,
}: { month: string; onClose: () => void }) {
  const { data: list = [], isLoading } = useQuery<OverdueSubscriberItem[]>({
    queryKey: ['overdue-list'],
    queryFn: getOverdueSubscribersList,
  })

  return (
    <ModalOverlay onClose={onClose}>
      {/* Header */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--red-bg)', border: '1px solid var(--red-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={18} color="var(--red)" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              Clientes Inadimplentes
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
              {isLoading ? 'Carregando…' : `${list.length} ${list.length === 1 ? 'registro' : 'registros'}`}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {isLoading ? (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Carregando…
          </div>
        ) : list.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
            <div style={{ color: 'var(--green)', fontWeight: 600, fontSize: 14 }}>Nenhum inadimplente</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
              Todos os mensalistas estão em dia
            </div>
          </div>
        ) : (
          <div style={{ padding: '8px 0' }}>
            {list.map((sub, i) => (
              <div
                key={sub.id}
                style={{
                  padding: '12px 24px',
                  borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                    {sub.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                    {sub.cpf}
                    {sub.phone ? ` · ${sub.phone}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: 'var(--red)', background: 'var(--red-bg)', border: '1px solid var(--red-border)',
                    borderRadius: 4, padding: '2px 8px', fontFamily: 'JetBrains Mono',
                  }}>
                    inadimplente
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Vence dia {sub.due_day}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalOverlay>
  )
}

function PaymentsModal({
  month, onClose,
}: { month: string; onClose: () => void }) {
  const { data: list = [], isLoading } = useQuery<MonthPaymentDetail[]>({
    queryKey: ['month-payments', month],
    queryFn: () => getMonthPaymentsList(month),
  })

  const monthLabel = new Date(month + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const total = list.reduce((s, p) => s + Number(p.amount), 0)

  return (
    <ModalOverlay onClose={onClose}>
      {/* Header */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--green-bg)', border: '1px solid var(--green-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle size={18} color="var(--green)" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              Pagamentos — {monthLabel}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
              {isLoading ? 'Carregando…' : `${list.length} ${list.length === 1 ? 'pagamento' : 'pagamentos'}`}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {isLoading ? (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Carregando…
          </div>
        ) : list.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Nenhum pagamento registrado</div>
          </div>
        ) : (
          <>
            <div style={{ padding: '8px 0' }}>
              {list.map((p, i) => (
                <div
                  key={`${p.subscriber_id}-${p.payment_date}-${i}`}
                  style={{
                    padding: '12px 24px',
                    borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                      {p.subscriber_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MethodBadge method={p.payment_method} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                        {new Date(p.payment_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    {p.notes && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                        {p.notes}
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontFamily: 'JetBrains Mono', fontWeight: 700,
                    fontSize: 15, color: 'var(--amber)', flexShrink: 0, marginLeft: 16,
                  }}>
                    {fmtBRL(p.amount)}
                  </div>
                </div>
              ))}
            </div>
            {/* Footer total */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--surface)',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total recebido
              </span>
              <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 16, color: 'var(--green)' }}>
                {fmtBRL(total)}
              </span>
            </div>
          </>
        )}
      </div>
    </ModalOverlay>
  )
}

export default function Financial() {
  const [startDate, setStartDate] = useState(fmtDate(firstOfMonth))
  const [endDate, setEndDate] = useState(fmtDate(today))
  const [month, setMonth] = useState(currentMonth)
  const [refDate, setRefDate] = useState(fmtDate(today))
  const [showOverdueModal, setShowOverdueModal] = useState(false)
  const [showPaymentsModal, setShowPaymentsModal] = useState(false)

  const { data: revenue } = useQuery<RevenueResponse>({
    queryKey: ['revenue', startDate, endDate],
    queryFn: () => getRevenue(startDate, endDate),
  })

  const { data: daily = [] } = useQuery<DailyRevenueItem[]>({
    queryKey: ['daily-revenue', month],
    queryFn: () => getDailyRevenue(month),
  })

  const { data: summary } = useQuery<ParkingSummary>({
    queryKey: ['parking-summary', startDate, endDate],
    queryFn: () => getParkingSummary(startDate, endDate),
  })

  const { data: subRevenue } = useQuery<SubscriberRevenue>({
    queryKey: ['sub-revenue', month],
    queryFn: () => getSubscriberRevenue(month),
  })

  const { data: hourly = [] } = useQuery<HourlyRevenueItem[]>({
    queryKey: ['hourly-revenue', refDate],
    queryFn: () => getHourlyRevenue(refDate),
  })

  const chartData = daily.map((d) => ({
    date: d.date,
    total: Number(d.total),
    entries: d.entries_count,
  }))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Financeiro</div>
          <div className="page-subtitle">Relatórios de receita e movimentação</div>
        </div>
      </div>

      {/* Date range filter */}
      <div className="card mb-16" style={{ padding: '12px 16px' }}>
        <div className="filter-date-grid">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Data inicial</label>
            <input type="date" className="form-input" style={{ cursor: 'pointer' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker() } catch {} }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Data final</label>
            <input type="date" className="form-input" style={{ cursor: 'pointer' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker() } catch {} }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Mês (gráfico diário)</label>
            <input type="month" className="form-input" style={{ cursor: 'pointer' }} value={month} onChange={(e) => setMonth(e.target.value)} onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker() } catch {} }} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Dia (gráfico horário)</label>
            <input type="date" className="form-input" style={{ cursor: 'pointer' }} value={refDate} onChange={(e) => setRefDate(e.target.value)} onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker() } catch {} }} />
          </div>
        </div>
      </div>

      {/* Revenue cards */}
      <div className="stats-grid mb-16">
        <div className="stat-card" style={{ '--accent-color': 'var(--amber)' } as React.CSSProperties}>
          <TrendingUp size={18} color="var(--amber)" style={{ marginBottom: 8 }} />
          <div className="stat-label">Receita Total</div>
          <div className="stat-value money">{revenue ? fmtBRL(revenue.total) : '—'}</div>
          <div className="stat-sub">
            {revenue ? `${revenue.entries_count} Avulsos, ${revenue.subscriber_payments_count} Mensais` : '—'}
          </div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--orange)' } as React.CSSProperties}>
          <Car size={18} color="var(--orange)" style={{ marginBottom: 8 }} />
          <div className="stat-label">Clientes Avulsos</div>
          <div className="stat-value money">{revenue ? fmtBRL(revenue.by_client_type.regular) : '—'}</div>
          <div className="stat-sub">{summary?.regular_entries ?? '—'} Entradas</div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--green)' } as React.CSSProperties}>
          <Star size={18} color="var(--green)" style={{ marginBottom: 8 }} />
          <div className="stat-label">Mensalistas</div>
          <div className="stat-value money">{revenue ? fmtBRL(revenue.by_client_type.subscriber) : '—'}</div>
          <div className="stat-sub">{revenue?.subscriber_payments_count ?? '—'} Mensalidades pagas</div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--blue)' } as React.CSSProperties}>
          <Car size={18} color="var(--blue)" style={{ marginBottom: 8 }} />
          <div className="stat-label">Entradas</div>
          <div className="stat-value">{summary?.total_entries ?? '—'}</div>
          <div className="stat-sub">Mensalistas: {summary?.subscriber_entries ?? '—'}</div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--text-muted)' } as React.CSSProperties}>
          <Clock size={18} color="var(--text-muted)" style={{ marginBottom: 8 }} />
          <div className="stat-label">Permanência média</div>
          <div className="stat-value money">
            {summary ? fmtDuration(summary.regular_average_stay_minutes) : '—'}
          </div>
          <div className="stat-sub">
            Pico: {summary?.peak_hour !== null && summary?.peak_hour !== undefined
              ? `${String(summary.peak_hour).padStart(2,'0')}h` : '—'}
          </div>
        </div>
      </div>

      {/* Daily chart */}
      <div className="card mb-16">
        <div className="card-header">
          <div className="card-title">Receita Diária — {new Date(month + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono' }}>R$</div>
        </div>
        {chartData.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px' }}>
            <div className="text-muted" style={{ fontSize: 13 }}>Sem dados para o período</div>
          </div>
        ) : (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="amberBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={1} />
                    <stop offset="100%" stopColor="#D97706" stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d + 'T12:00:00').getDate().toString()}
                  tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                  interval={1}
                />
                <YAxis
                  tickFormatter={(v) => v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(v)}
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245,158,11,0.06)' }} />
                <Bar dataKey="total" fill="url(#amberBarGrad)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Hourly chart */}
      <div className="card mb-16">
        <div className="card-header">
          <div>
            <div className="card-title">Receita por Hora</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Comparativo: {new Date(refDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              {' vs '}
              {new Date(new Date(refDate + 'T12:00:00').getTime() - 86400000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </div>
          </div>
        </div>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={hourly.map((h) => ({
                hour: h.hour,
                Hoje: Number(h.today),
                Ontem: Number(h.yesterday),
              }))}
              margin={{ top: 8, right: 8, bottom: 4, left: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="hour"
                tickFormatter={(h) => `${String(h).padStart(2, '0')}h`}
                tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}
                axisLine={false}
                tickLine={false}
                interval={2}
              />
              <YAxis
                tickFormatter={(v) => `R$${v}`}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div style={{
                      background: 'var(--surface-2)', border: '1px solid var(--border-light)',
                      borderRadius: 8, padding: '10px 14px', fontSize: 13,
                    }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'JetBrains Mono' }}>
                        {String(label).padStart(2, '0')}:00
                      </div>
                      {payload.map((p) => (
                        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
                          <span style={{ color: p.color as string, fontSize: 12 }}>{p.name}</span>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: p.color as string }}>
                            {fmtBRL(p.value as number)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                }}
                cursor={{ stroke: 'var(--border-light)', strokeWidth: 1 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                formatter={(value) => <span style={{ color: 'var(--text-muted)' }}>{value}</span>}
              />
              <Line
                type="monotone"
                dataKey="Hoje"
                stroke="var(--amber)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'var(--amber)' }}
              />
              <Line
                type="monotone"
                dataKey="Ontem"
                stroke="var(--blue)"
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={false}
                activeDot={{ r: 4, fill: 'var(--blue)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment method breakdown */}
      {revenue && (
        <div className="card mb-16">
          <div className="card-header">
            <div className="card-title">Formas de Pagamento</div>
          </div>
          <div className="payment-methods-grid">
            {(['dinheiro', 'credito', 'debito', 'pix'] as const).map((m) => (
              <div key={m} className="payment-methods-item">
                <div className="stat-label">{m}</div>
                <div className="payment-value">
                  {fmtBRL(revenue.by_payment_method[m])}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscriber monthly revenue */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Mensalidades — {new Date(month + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div>
        </div>
        <div className="sub-revenue-grid">
          <div className="sub-revenue-item">
            <div className="stat-label">Recebido</div>
            <div className="mono sub-revenue-value" style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>
              {subRevenue ? fmtBRL(subRevenue.total_received) : '—'}
            </div>
          </div>
          <div className="sub-revenue-item">
            <div className="stat-label">Pagamentos</div>
            <button
              onClick={() => subRevenue && subRevenue.payments_count > 0 && setShowPaymentsModal(true)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: subRevenue && subRevenue.payments_count > 0 ? 'pointer' : 'default',
                display: 'block', textAlign: 'inherit',
              }}
            >
              <div
                className="mono sub-revenue-value"
                style={{
                  fontSize: 20, fontWeight: 700, color: 'var(--text)', marginTop: 4,
                  textDecoration: subRevenue && subRevenue.payments_count > 0 ? 'underline' : 'none',
                  textDecorationStyle: 'dotted',
                  textUnderlineOffset: 3,
                  textDecorationColor: 'var(--text-dim)',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => { if (subRevenue && subRevenue.payments_count > 0) (e.currentTarget as HTMLElement).style.color = 'var(--green)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
              >
                {subRevenue?.payments_count ?? '—'}
              </div>
            </button>
          </div>
          <div className="sub-revenue-item">
            <div className="stat-label">Inadimplentes</div>
            <button
              onClick={() => subRevenue !== undefined && setShowOverdueModal(true)}
              style={{
                background: 'none', border: 'none', padding: 0,
                cursor: subRevenue !== undefined ? 'pointer' : 'default',
                display: 'block', textAlign: 'inherit',
              }}
            >
              <div
                className="mono sub-revenue-value"
                style={{
                  fontSize: 20, fontWeight: 700,
                  color: subRevenue?.overdue_count ? 'var(--red)' : 'var(--text)',
                  marginTop: 4,
                  textDecoration: subRevenue !== undefined ? 'underline' : 'none',
                  textDecorationStyle: 'dotted',
                  textUnderlineOffset: 3,
                  textDecorationColor: subRevenue?.overdue_count ? 'var(--red-border)' : 'var(--text-dim)',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { if (subRevenue !== undefined) (e.currentTarget as HTMLElement).style.opacity = '0.75' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
              >
                {subRevenue?.overdue_count ?? '—'}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showOverdueModal && (
        <OverdueModal month={month} onClose={() => setShowOverdueModal(false)} />
      )}
      {showPaymentsModal && (
        <PaymentsModal month={month} onClose={() => setShowPaymentsModal(false)} />
      )}
    </div>
  )
}
