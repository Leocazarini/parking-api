import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { Search, ArrowLeft, CreditCard, Users, AlertCircle } from 'lucide-react'
import { getActiveSubscribers, registerSubscriberPayment } from '../api/subscribers'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../hooks/useToast'
import type { Subscriber } from '../types'

function fmtCurrency(digits: string): string {
  const num = parseInt(digits || '0', 10)
  return (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const PAYMENT_METHODS = [
  { value: 'pix',      label: 'PIX' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'credito',  label: 'Crédito' },
  { value: 'debito',   label: 'Débito' },
] as const

interface PayFormData {
  amount: number
  reference_month: string
  payment_date: string
  payment_method: string
  notes?: string
}

export default function SubscriberPayment() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [nameSearch, setNameSearch] = useState('')
  const [selected, setSelected] = useState<Pick<Subscriber, 'id' | 'name' | 'due_day' | 'status' | 'is_active'> | null>(null)
  const [amountDigits, setAmountDigits] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const currentMonth = today.slice(0, 7)

  const { data: activeSubscribers = [], isLoading } = useQuery({
    queryKey: ['subscribers-active'],
    queryFn: getActiveSubscribers,
    staleTime: 60_000,
  })

  const filtered = useMemo(() => {
    const q = nameSearch.trim().toLowerCase()
    if (!q) return activeSubscribers
    return activeSubscribers.filter((s) => s.name.toLowerCase().includes(q))
  }, [activeSubscribers, nameSearch])

  const {
    register, handleSubmit, control, reset,
    formState: { errors },
  } = useForm<PayFormData>({
    defaultValues: {
      reference_month: currentMonth,
      payment_date: today,
      payment_method: 'pix',
    },
  })

  const payMut = useMutation({
    mutationFn: (d: PayFormData) =>
      registerSubscriberPayment(selected!.id, {
        ...d,
        amount: Number(d.amount),
        reference_month: d.reference_month + '-01',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscribers-active'] })
      toast('Pagamento registrado com sucesso', 'success')
      setSelected(null)
      setAmountDigits('')
      reset({ reference_month: currentMonth, payment_date: today, payment_method: 'pix' })
    },
  })

  return (
    <div className="page">
      {!selected ? (
        <>
          <div className="page-header">
            <div>
              <div className="page-title">Pagar Mensalista</div>
              <div className="page-subtitle">{activeSubscribers.length} mensalistas ativos</div>
            </div>
          </div>

          <div className="search-bar mb-16">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por nome…"
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              autoFocus
            />
          </div>

          {isLoading ? (
            <div className="loading-center"><div className="spinner" /> Carregando…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Users size={40} />
              <div className="empty-state-title">Nenhum mensalista ativo</div>
              <div className="empty-state-sub">Tente uma busca diferente</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="subscriber-pay-row"
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Vencimento: dia {s.due_day}
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => { setSelected(null); setAmountDigits('') }}
              className="btn btn-ghost btn-sm"
              style={{ paddingLeft: 0 }}
            >
              <ArrowLeft size={15} /> Voltar
            </button>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--amber-bg)', border: '1px solid var(--amber-border)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 24,
          }}>
            <CreditCard size={18} color="var(--amber)" />
            <div>
              <div style={{ fontFamily: 'Barlow Condensed', fontSize: 20, fontWeight: 900, letterSpacing: '0.03em', color: 'var(--text)' }}>
                {selected.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                Vencimento: dia {selected.due_day}
              </div>
            </div>
          </div>

          <form key={selected.id} onSubmit={handleSubmit((d) => payMut.mutate(d))}>
            <Controller
              control={control}
              name="amount"
              rules={{
                required: 'Valor obrigatório',
                validate: (v) => Number(v) > 0 || 'Valor deve ser maior que zero',
              }}
              render={({ field, fieldState }) => (
                <div className="form-group">
                  <label className="form-label">Valor (R$) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={`form-input mono ${fieldState.error ? 'error' : ''}`}
                    style={{ fontSize: 28, textAlign: 'center', letterSpacing: '0.06em', fontWeight: 700, padding: '16px' }}
                    value={`R$ ${fmtCurrency(amountDigits)}`}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    autoFocus
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '')
                      const next = digits.replace(/^0+/, '') || ''
                      if (next.length <= 9) {
                        setAmountDigits(next)
                        field.onChange(next ? parseInt(next, 10) / 100 : 0)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Unidentified') return
                      if (e.metaKey || e.ctrlKey) return
                      if (['Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
                      e.preventDefault()
                      if (e.key >= '0' && e.key <= '9') {
                        const next = (amountDigits + e.key).replace(/^0+/, '') || '0'
                        if (next.length <= 9) {
                          setAmountDigits(next)
                          field.onChange(parseInt(next, 10) / 100)
                        }
                      } else if (e.key === 'Backspace' || e.key === 'Delete') {
                        const next = amountDigits.slice(0, -1)
                        setAmountDigits(next)
                        field.onChange(next ? parseInt(next, 10) / 100 : 0)
                      }
                    }}
                  />
                  {fieldState.error && (
                    <span className="form-error"><AlertCircle size={12} />{fieldState.error.message}</span>
                  )}
                </div>
              )}
            />

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Mês referência *</label>
                <input
                  type="month"
                  className={`form-input ${errors.reference_month ? 'error' : ''}`}
                  {...register('reference_month', { required: 'Obrigatório' })}
                />
                {errors.reference_month && (
                  <span className="form-error"><AlertCircle size={12} />{errors.reference_month.message}</span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Data pagamento *</label>
                <input
                  type="date"
                  className={`form-input ${errors.payment_date ? 'error' : ''}`}
                  {...register('payment_date', { required: 'Obrigatório' })}
                />
                {errors.payment_date && (
                  <span className="form-error"><AlertCircle size={12} />{errors.payment_date.message}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Forma de pagamento *</label>
              <Controller
                control={control}
                name="payment_method"
                rules={{ required: true }}
                render={({ field }) => (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => field.onChange(m.value)}
                        style={{
                          padding: '12px 4px',
                          border: `1px solid ${field.value === m.value ? 'var(--amber)' : 'var(--border)'}`,
                          borderRadius: 8,
                          background: field.value === m.value ? 'var(--amber-bg)' : 'var(--surface-raised)',
                          color: field.value === m.value ? 'var(--amber)' : 'var(--text-muted)',
                          fontFamily: 'Barlow Condensed',
                          fontSize: 14,
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          cursor: 'pointer',
                          transition: 'all var(--t)',
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Observações</label>
              <input
                className={`form-input ${errors.notes ? 'error' : ''}`}
                maxLength={500}
                {...register('notes', { maxLength: { value: 500, message: 'Máximo 500 caracteres' } })}
              />
              {errors.notes && (
                <span className="form-error"><AlertCircle size={12} />{errors.notes.message}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={payMut.isPending}
              style={{ marginTop: 4 }}
            >
              {payMut.isPending
                ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Registrando…</>
                : 'Confirmar Pagamento'
              }
            </button>
          </form>
        </>
      )}

      <style>{`
        .subscriber-pay-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: var(--surface-raised);
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          text-align: left;
          width: 100%;
          transition: border-color var(--t), background var(--t);
          color: var(--text);
        }
        .subscriber-pay-row:hover {
          border-color: var(--amber-border);
          background: var(--surface-hover);
        }
      `}</style>
    </div>
  )
}
