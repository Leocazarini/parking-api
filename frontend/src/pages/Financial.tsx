import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts'
import { TrendingUp, Car, Clock, Star } from 'lucide-react'
import { getRevenue, getDailyRevenue, getParkingSummary, getSubscriberRevenue, getHourlyRevenue } from '../api/financial'
import type { RevenueResponse, DailyRevenueItem, ParkingSummary, SubscriberRevenue, HourlyRevenueItem } from '../types'

function fmtBRL(v: string | number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(d: Date) {
  return d.toISOString().split('T')[0]
}

const today = new Date()
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
const currentMonth = today.toISOString().slice(0, 7)

// Custom recharts tooltip
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

export default function Financial() {
  const [startDate, setStartDate] = useState(fmtDate(firstOfMonth))
  const [endDate, setEndDate] = useState(fmtDate(today))
  const [month, setMonth] = useState(currentMonth)
  const [refDate, setRefDate] = useState(fmtDate(today))

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
      <div className="card mb-16" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
            <label className="form-label">Data inicial</label>
            <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
            <label className="form-label">Data final</label>
            <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
            <label className="form-label">Mês (gráfico diário)</label>
            <input type="month" className="form-input" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
            <label className="form-label">Dia (gráfico horário)</label>
            <input type="date" className="form-input" value={refDate} onChange={(e) => setRefDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Revenue cards */}
      <div className="stats-grid mb-16">
        <div className="stat-card" style={{ '--accent-color': 'var(--amber)' } as React.CSSProperties}>
          <TrendingUp size={18} color="var(--amber)" style={{ marginBottom: 8 }} />
          <div className="stat-label">Receita Total</div>
          <div className="stat-value money">{revenue ? fmtBRL(revenue.total) : '—'}</div>
          <div className="stat-sub">{revenue?.entries_count ?? '—'} saídas avulsos</div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--orange)' } as React.CSSProperties}>
          <Car size={18} color="var(--orange)" style={{ marginBottom: 8 }} />
          <div className="stat-label">Clientes Avulsos</div>
          <div className="stat-value money">{revenue ? fmtBRL(revenue.by_client_type.regular) : '—'}</div>
          <div className="stat-sub">{summary?.regular_entries ?? '—'} entradas</div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--green)' } as React.CSSProperties}>
          <Star size={18} color="var(--green)" style={{ marginBottom: 8 }} />
          <div className="stat-label">Mensalistas</div>
          <div className="stat-value money">{revenue ? fmtBRL(revenue.by_client_type.subscriber) : '—'}</div>
          <div className="stat-sub">{revenue?.subscriber_payments_count ?? '—'} mensalidades pagas</div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--blue)' } as React.CSSProperties}>
          <Car size={18} color="var(--blue)" style={{ marginBottom: 8 }} />
          <div className="stat-label">Entradas</div>
          <div className="stat-value">{summary?.total_entries ?? '—'}</div>
          <div className="stat-sub">mensalistas: {summary?.subscriber_entries ?? '—'}</div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--text-muted)' } as React.CSSProperties}>
          <Clock size={18} color="var(--text-muted)" style={{ marginBottom: 8 }} />
          <div className="stat-label">Permanência média</div>
          <div className="stat-value money">
            {summary ? `${Math.round(summary.average_stay_minutes)}min` : '—'}
          </div>
          <div className="stat-sub">
            pico: {summary?.peak_hour !== null && summary?.peak_hour !== undefined
              ? `${String(summary.peak_hour).padStart(2,'0')}h` : '—'}
          </div>
        </div>
      </div>

      {/* Daily chart */}
      <div className="card mb-16">
        <div className="card-header">
          <div className="card-title">Receita Diária — {new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div>
        </div>
        {chartData.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px' }}>
            <div className="text-muted" style={{ fontSize: 13 }}>Sem dados para o período</div>
          </div>
        ) : (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d + 'T12:00:00').getDate().toString()}
                  tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `R$${v}`}
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
                <Bar dataKey="total" fill="var(--amber)" radius={[4, 4, 0, 0]} maxBarSize={32} />
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {(['dinheiro', 'credito', 'debito', 'pix'] as const).map((m) => (
              <div key={m} style={{ textAlign: 'center' }}>
                <div className="stat-label" style={{ textTransform: 'capitalize' }}>{m}</div>
                <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
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
          <div className="card-title">Mensalidades — {new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div>
            <div className="stat-label">Recebido</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>
              {subRevenue ? fmtBRL(subRevenue.total_received) : '—'}
            </div>
          </div>
          <div>
            <div className="stat-label">Pagamentos</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
              {subRevenue?.payments_count ?? '—'}
            </div>
          </div>
          <div>
            <div className="stat-label">Inadimplentes</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: subRevenue?.overdue_count ? 'var(--red)' : 'var(--text)', marginTop: 4 }}>
              {subRevenue?.overdue_count ?? '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
