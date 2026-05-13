import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, ChevronLeft, ChevronRight, Car,
  CreditCard, Banknote, Smartphone, Building2,
  Clock, Calendar,
} from 'lucide-react'
import { getHistory } from '../api/parking'
import { Modal } from '../components/Modal'
import { fmtDuration, parseApiDate, formatTicket } from '../utils'
import type { HistoryParams } from '../api/parking'
import type { HistoryEntry } from '../types'

const PAGE_SIZE = 50

const paymentLabel: Record<string, string> = {
  pix: 'PIX', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro',
}

const paymentIcon: Record<string, typeof Car> = {
  pix: Smartphone, credito: CreditCard, debito: Building2, dinheiro: Banknote,
}

const colorMap: Record<string, string> = {
  azul: '#3b82f6', branco: '#f1f5f9', cinza: '#94a3b8', grafite: '#475569',
  prata: '#cbd5e1', preto: '#1e293b', vermelho: '#ef4444', amarelo: '#eab308',
  verde: '#22c55e', laranja: '#f97316', marrom: '#92400e', bege: '#d4b896',
  roxo: '#a855f7', rosa: '#ec4899',
}

function colorHex(name: string) {
  return colorMap[name.toLowerCase()] ?? '#64748b'
}

function fmtDate(iso: string) {
  return parseApiDate(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmtDateFull(iso: string) {
  return parseApiDate(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtTime(iso: string) {
  return parseApiDate(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtCurrency(val: string | null) {
  if (val === null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val))
}

function calcDuration(entry_at: string, exit_at: string) {
  return Math.round((parseApiDate(exit_at).getTime() - parseApiDate(entry_at).getTime()) / 60000)
}

function isNoCharge(entry: HistoryEntry) {
  return (
    (entry.client_type === 'subscriber' && entry.amount_charged === null) ||
    (entry.amount_charged !== null && Number(entry.amount_charged) === 0)
  )
}

// ─── Detail modal ────────────────────────────────────────────────────────────
function EntryDetailModal({ entry, onClose }: { entry: HistoryEntry; onClose: () => void }) {
  const isSubscriber = entry.client_type === 'subscriber'
  const isFree = isNoCharge(entry)
  const durationMin = calcDuration(entry.entry_at, entry.exit_at)
  const PayIcon = entry.payment_method ? (paymentIcon[entry.payment_method] ?? Car) : null

  return (
    <Modal open onClose={onClose} title={entry.plate}>
      {/* Ticket + Type badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span className="mono" style={{ fontSize: 13, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          {formatTicket(entry.id)}
        </span>
        <span className={`badge ${isSubscriber ? 'badge-subscriber' : 'badge-regular'}`}>
          {isSubscriber ? 'Mensalista' : 'Avulso'}
        </span>
      </div>

      {/* Vehicle */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          className="color-dot"
          style={{ width: 14, height: 14, background: colorHex(entry.color), flexShrink: 0 }}
        />
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{entry.model ?? '—'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entry.color}</div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card" style={{ padding: '12px 14px' }}>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            <Calendar size={11} /> Entrada
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{fmtDateFull(entry.entry_at)}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{fmtTime(entry.entry_at)}</div>
        </div>

        <div className="card" style={{ padding: '12px 14px' }}>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            <Calendar size={11} /> Saída
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{fmtDateFull(entry.exit_at)}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{fmtTime(entry.exit_at)}</div>
        </div>

        <div className="card" style={{ padding: '12px 14px' }}>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            <Clock size={11} /> Permanência
          </div>
          <div className="mono" style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
            {fmtDuration(durationMin)}
          </div>
        </div>

        <div className="card" style={{ padding: '12px 14px' }}>
          <div className="stat-label" style={{ marginBottom: 6 }}>Pagamento</div>
          {entry.payment_method ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
              {PayIcon && <PayIcon size={14} style={{ color: 'var(--text-muted)' }} />}
              {paymentLabel[entry.payment_method] ?? entry.payment_method}
            </div>
          ) : (
            <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>
              {isSubscriber ? 'Sem pagamento' : '—'}
            </div>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="charge-display">
        <div className="charge-label">Total cobrado</div>
        <div className={`charge-amount ${isFree ? 'free' : ''}`} style={{ fontSize: 36 }}>
          {isFree ? 'SEM COBRANÇA' : fmtCurrency(entry.amount_charged)}
        </div>
      </div>
    </Modal>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function History() {
  const [page, setPage] = useState(1)
  const [plateInput, setPlateInput] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [clientType, setClientType] = useState('')
  const [filters, setFilters] = useState<HistoryParams>({ page: 1, page_size: PAGE_SIZE })
  const [selected, setSelected] = useState<HistoryEntry | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['history', filters],
    queryFn: () => getHistory(filters),
    placeholderData: (prev) => prev,
  })

  function applyFilters() {
    const next: HistoryParams = { page: 1, page_size: PAGE_SIZE }
    if (plateInput.trim()) next.plate = plateInput.trim().toUpperCase()
    if (dateFrom) next.date_from = dateFrom
    if (dateTo) next.date_to = dateTo + 'T23:59:59'
    if (clientType) next.client_type = clientType
    setPage(1)
    setFilters(next)
  }

  function clearFilters() {
    setPlateInput('')
    setDateFrom('')
    setDateTo('')
    setClientType('')
    setPage(1)
    setFilters({ page: 1, page_size: PAGE_SIZE })
  }

  function goTo(p: number) {
    setPage(p)
    setFilters((f) => ({ ...f, page: p }))
  }

  const hasFilters = !!(plateInput || dateFrom || dateTo || clientType)
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const pages = data?.pages ?? 1

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Histórico</div>
          <div className="page-subtitle">
            {total > 0
              ? `${total} registro${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`
              : 'Registros de entradas e saídas'}
          </div>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="hist-filter-wrap">
        <div className="hist-filter-grid">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Placa</label>
            <div className="search-bar" style={{ padding: '7px 12px' }}>
              <Search size={14} />
              <input
                placeholder="ABC1234"
                value={plateInput}
                onChange={(e) => setPlateInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                maxLength={8}
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Data inicial</label>
            <input className="form-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Data final</label>
            <input className="form-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Tipo</label>
            <div className="select-wrapper">
              <select className="form-input form-select" value={clientType} onChange={(e) => setClientType(e.target.value)}>
                <option value="">Todos</option>
                <option value="regular">Avulso</option>
                <option value="subscriber">Mensalista</option>
              </select>
            </div>
          </div>
        </div>

        <div className="hist-filter-actions">
          <button className="btn btn-primary" onClick={applyFilters}>
            <Search size={14} /> Filtrar
          </button>
          {hasFilters && (
            <button className="btn btn-secondary" onClick={clearFilters}>
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <Car size={40} />
          <div className="empty-state-title">Nenhum registro encontrado</div>
          <div className="empty-state-sub">Tente ajustar os filtros</div>
        </div>
      ) : (
        <>
          {/* ── Desktop: tabela ── */}
          <div className="hist-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Entrada</th>
                  <th>Saída</th>
                  <th>Placa</th>
                  <th>Veículo</th>
                  <th>Tipo</th>
                  <th>Permanência</th>
                  <th>Valor</th>
                  <th>Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {items.map((entry) => {
                  const isSubscriber = entry.client_type === 'subscriber'
                  const isFree = isNoCharge(entry)
                  const durationMin = calcDuration(entry.entry_at, entry.exit_at)
                  const PayIcon = entry.payment_method ? (paymentIcon[entry.payment_method] ?? null) : null

                  return (
                    <tr key={entry.id} onClick={() => setSelected(entry)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="mono" style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                          {formatTicket(entry.id)}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{fmtDate(entry.entry_at)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtTime(entry.entry_at)}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{fmtDate(entry.exit_at)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtTime(entry.exit_at)}</div>
                      </td>
                      <td className="td-plate">{entry.plate}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span className="color-dot" style={{ background: colorHex(entry.color) }} />
                          <div>
                            <div style={{ fontWeight: 500 }}>{entry.model ?? '—'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.color}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${isSubscriber ? 'badge-subscriber' : 'badge-regular'}`}>
                          {isSubscriber ? 'Mensalista' : 'Avulso'}
                        </span>
                      </td>
                      <td className="mono" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {fmtDuration(durationMin)}
                      </td>
                      <td>
                        {isFree ? (
                          <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                            {isSubscriber ? 'Sem cobrança' : 'Isento'}
                          </span>
                        ) : entry.amount_charged === null ? (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        ) : (
                          <span style={{ fontWeight: 600 }}>{fmtCurrency(entry.amount_charged)}</span>
                        )}
                      </td>
                      <td>
                        {entry.payment_method ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 12 }}>
                            {PayIcon && <PayIcon size={13} />}
                            {paymentLabel[entry.payment_method] ?? entry.payment_method}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile: cards ── */}
          <div className="hist-cards">
            {items.map((entry) => {
              const isFree = isNoCharge(entry)

              return (
                <button
                  key={entry.id}
                  className={`hist-card ${entry.client_type}`}
                  onClick={() => setSelected(entry)}
                >
                  <div className="hist-card-top">
                    <span className="hist-card-plate">
                      {entry.plate}
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block', fontWeight: 400, letterSpacing: '0.06em' }}>
                        {formatTicket(entry.id)}
                      </span>
                    </span>
                    <span className={`hist-card-amount ${isFree ? 'free' : ''}`}>
                      {isFree
                        ? (entry.client_type === 'subscriber' ? 'Sem cobrança' : 'Isento')
                        : fmtCurrency(entry.amount_charged)}
                    </span>
                  </div>
                  <div className="hist-card-bottom">
                    <span className="hist-card-exit">
                      <Calendar size={11} />
                      {fmtDate(entry.exit_at)} · {fmtTime(entry.exit_at)}
                    </span>
                    <span className="hist-card-vehicle">
                      <span
                        className="color-dot"
                        style={{ width: 8, height: 8, background: colorHex(entry.color), flexShrink: 0 }}
                      />
                      {entry.model ?? entry.color}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── Paginação ── */}
          {pages > 1 && (
            <div className="hist-pagination">
              <span className="hist-pagination-info">
                Página {page} de {pages} · {total} registros
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => goTo(page - 1)} disabled={page <= 1}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, pages - 4))
                  const p = start + i
                  return (
                    <button
                      key={p}
                      className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => goTo(p)}
                      style={{ minWidth: 32 }}
                    >
                      {p}
                    </button>
                  )
                })}
                <button className="btn btn-secondary btn-sm" onClick={() => goTo(page + 1)} disabled={page >= pages}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modal de detalhes ── */}
      {selected && (
        <EntryDetailModal entry={selected} onClose={() => setSelected(null)} />
      )}

      <style>{`
        /* Filtros */
        .hist-filter-wrap {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
          padding: 16px;
          margin-bottom: 16px;
        }
        .hist-filter-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 12px;
        }
        .hist-filter-actions {
          display: flex;
          gap: 8px;
        }

        /* Tabela desktop */
        .hist-table-wrap {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
          overflow: hidden;
          margin-bottom: 16px;
        }

        /* Cards mobile */
        .hist-cards {
          display: none;
          flex-direction: column;
          border: 1px solid var(--border);
          border-radius: var(--r-md);
          overflow: hidden;
          margin-bottom: 16px;
        }
        .hist-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 13px 16px 13px 20px;
          background: var(--surface);
          border: none;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          text-align: left;
          width: 100%;
          position: relative;
          transition: background var(--t);
          color: var(--text);
        }
        .hist-card:last-child { border-bottom: none; }
        .hist-card:active { background: var(--surface-2); }
        .hist-card::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          border-radius: 2px 0 0 2px;
        }
        .hist-card.regular::before    { background: var(--blue); }
        .hist-card.subscriber::before { background: var(--amber); }

        .hist-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .hist-card-plate {
          font-family: 'JetBrains Mono', monospace;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--text);
        }
        .hist-card-amount {
          font-family: 'JetBrains Mono', monospace;
          font-size: 15px;
          font-weight: 700;
          color: var(--amber);
          flex-shrink: 0;
        }
        .hist-card-amount.free { color: var(--green); }

        .hist-card-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .hist-card-exit {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: var(--text-muted);
        }
        .hist-card-exit svg { color: var(--text-dim); flex-shrink: 0; }
        .hist-card-vehicle {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        /* Paginação */
        .hist-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          padding: 4px 0 8px;
        }
        .hist-pagination-info {
          font-size: 12px;
          color: var(--text-muted);
        }

        /* ── Mobile overrides ── */
        @media (max-width: 768px) {
          .hist-filter-grid {
            grid-template-columns: 1fr;
            gap: 8px;
            margin-bottom: 10px;
          }
          .hist-filter-actions { flex-direction: column; }
          .hist-filter-actions .btn { width: 100%; justify-content: center; }
          .hist-table-wrap { display: none; }
          .hist-cards { display: flex; }
          .hist-pagination { justify-content: center; }
          .hist-pagination-info { display: none; }
        }
      `}</style>
    </div>
  )
}
