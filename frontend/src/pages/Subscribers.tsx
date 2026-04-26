import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import {
  Plus, Search, ChevronRight, X, Trash2,
  DollarSign, AlertCircle, RefreshCw, Car, MapPin,
} from 'lucide-react'
import {
  getSubscribers, getSubscriber, createSubscriber,
  addSubscriberVehicle, removeSubscriberVehicle,
  registerSubscriberPayment, runOverdueCheck,
} from '../api/subscribers'
import { getColors, getModels } from '../api/catalog'
import { Modal } from '../components/Modal'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../hooks/useToast'
import type { Subscriber, SubscriberDetail, Color, VehicleModel } from '../types'

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const PLATE_MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/
const PLATE_OLD = /^[A-Z]{3}[0-9]{4}$/

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────


function fmtCPF(cpf: string) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function fmtPhone(p: string | null) {
  if (!p) return '—'
  const d = p.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return p
}

// ──────────────────────────────────────────────────────────────────────────────
// Create subscriber modal (includes first vehicle)
// ──────────────────────────────────────────────────────────────────────────────

interface VehicleEntry {
  plate: string
  model_id?: number
  color_id?: number
}

interface SubFormData {
  name: string
  cpf: string
  phone: string
  email: string
  due_day: number
  zip_code: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  vehicles: VehicleEntry[]
}

function SubscriberForm({
  onSubmit, isLoading,
}: {
  onSubmit: (d: SubFormData) => void
  isLoading: boolean
}) {
  const { data: colors = [] } = useQuery<Color[]>({ queryKey: ['colors'], queryFn: getColors, staleTime: Infinity })
  const { data: models = [] } = useQuery<VehicleModel[]>({ queryKey: ['models'], queryFn: getModels, staleTime: Infinity })

  const { register, handleSubmit, control, formState: { errors } } = useForm<SubFormData>({
    defaultValues: { vehicles: [{ plate: '', model_id: undefined, color_id: undefined }] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'vehicles' })

  // Pre-declare state field so we can provide a custom onChange while still calling RHF's handler
  const stateField = register('state', {
    maxLength: { value: 2, message: 'Máximo 2 caracteres' },
    validate: (v) => !v || /^[A-Z]{2}$/i.test(v) || '2 letras maiúsculas. Ex: SP',
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* ── Dados pessoais ── */}
      <div className="form-group">
        <label className="form-label">Nome completo *</label>
        <input className={`form-input ${errors.name ? 'error' : ''}`}
          maxLength={255}
          {...register('name', {
            required: 'Nome obrigatório',
            maxLength: { value: 255, message: 'Máximo 255 caracteres' },
          })} />
        {errors.name && <span className="form-error"><AlertCircle size={12} />{errors.name.message}</span>}
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">CPF *</label>
          <input className={`form-input ${errors.cpf ? 'error' : ''}`} placeholder="000.000.000-00"
            maxLength={14}
            {...register('cpf', {
              required: 'CPF obrigatório',
              validate: (v) => {
                const digits = v.replace(/\D/g, '')
                return digits.length === 11 || 'CPF deve ter 11 dígitos'
              },
            })} />
          {errors.cpf && <span className="form-error"><AlertCircle size={12} />{errors.cpf.message}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Dia do vencimento *</label>
          <input type="number" min={1} max={28} className={`form-input ${errors.due_day ? 'error' : ''}`}
            {...register('due_day', {
              required: 'Obrigatório',
              min: { value: 1, message: 'Entre 1 e 28' },
              max: { value: 28, message: 'Entre 1 e 28' },
              valueAsNumber: true,
            })} />
          {errors.due_day && <span className="form-error"><AlertCircle size={12} />{errors.due_day.message}</span>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Telefone</label>
        <input className={`form-input ${errors.phone ? 'error' : ''}`} placeholder="(11) 99999-9999"
          maxLength={15}
          {...register('phone', {
            validate: (v) => {
              if (!v) return true
              const digits = v.replace(/\D/g, '')
              return (digits.length === 10 || digits.length === 11) || 'Telefone deve ter 10 ou 11 dígitos'
            },
          })} />
        {errors.phone && <span className="form-error"><AlertCircle size={12} />{errors.phone.message}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">E-mail</label>
        <input type="email" className={`form-input ${errors.email ? 'error' : ''}`}
          maxLength={255}
          {...register('email', {
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'E-mail inválido' },
            maxLength: { value: 255, message: 'Máximo 255 caracteres' },
          })} />
        {errors.email && <span className="form-error"><AlertCircle size={12} />{errors.email.message}</span>}
      </div>

      {/* ── Endereço ── */}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <MapPin size={14} color="var(--amber)" />
          <span className="card-title" style={{ margin: 0 }}>Endereço</span>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">CEP</label>
            <input className={`form-input ${errors.zip_code ? 'error' : ''}`} placeholder="00000-000"
              maxLength={9}
              {...register('zip_code', {
                validate: (v) => {
                  if (!v) return true
                  const digits = v.replace(/\D/g, '')
                  return digits.length === 8 || 'CEP deve ter 8 dígitos'
                },
              })} />
            {errors.zip_code && <span className="form-error"><AlertCircle size={12} />{errors.zip_code.message}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Estado (UF)</label>
            <input
              ref={stateField.ref}
              name={stateField.name}
              onBlur={stateField.onBlur}
              placeholder="SP"
              maxLength={2}
              className={`form-input ${errors.state ? 'error' : ''}`}
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '')
                stateField.onChange(e)
              }}
            />
            {errors.state && <span className="form-error"><AlertCircle size={12} />{errors.state.message}</span>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Rua / Logradouro</label>
          <input className="form-input" placeholder="Rua das Flores" maxLength={255}
            {...register('street', { maxLength: { value: 255, message: 'Máximo 255 caracteres' } })} />
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Número</label>
            <input className="form-input" placeholder="123" maxLength={10}
              {...register('number', { maxLength: { value: 10, message: 'Máximo 10 caracteres' } })} />
          </div>
          <div className="form-group">
            <label className="form-label">Complemento</label>
            <input className="form-input" placeholder="Apto 4" maxLength={100}
              {...register('complement', { maxLength: { value: 100, message: 'Máximo 100 caracteres' } })} />
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Bairro</label>
            <input className="form-input" maxLength={255}
              {...register('neighborhood', { maxLength: { value: 255, message: 'Máximo 255 caracteres' } })} />
          </div>
          <div className="form-group">
            <label className="form-label">Cidade</label>
            <input className="form-input" maxLength={255}
              {...register('city', { maxLength: { value: 255, message: 'Máximo 255 caracteres' } })} />
          </div>
        </div>
      </div>

      {/* ── Veículos ── */}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Car size={14} color="var(--amber)" />
            <span className="card-title" style={{ margin: 0 }}>Veículos</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => append({ plate: '', model_id: undefined, color_id: undefined })}
          >
            <Plus size={13} /> Adicionar
          </button>
        </div>

        {fields.map((field, idx) => {
          const plateField = register(`vehicles.${idx}.plate` as const, {
            required: 'Placa obrigatória',
            validate: (v) => {
              const p = v.toUpperCase().trim()
              return PLATE_MERCOSUL.test(p) || PLATE_OLD.test(p) || 'Placa inválida. Use AAA0000 ou AAA0A00'
            },
          })
          return (
            <div key={field.id} style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 12,
              marginBottom: 10,
              background: 'var(--surface-raised)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  Veículo {idx + 1}
                </span>
                {fields.length > 1 && (
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(idx)}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Placa *</label>
                <input
                  ref={plateField.ref}
                  name={plateField.name}
                  onBlur={plateField.onBlur}
                  className={`plate-input w-full ${errors.vehicles?.[idx]?.plate ? 'error' : ''}`}
                  style={{ fontSize: 18 }}
                  placeholder="ABC1D23"
                  autoCapitalize="characters"
                  maxLength={8}
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase()
                    plateField.onChange(e)
                  }}
                />
                {errors.vehicles?.[idx]?.plate && (
                  <span className="form-error">
                    <AlertCircle size={12} />{errors.vehicles[idx].plate?.message}
                  </span>
                )}
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Modelo</label>
                  <div className="select-wrapper">
                    <select className="form-select" {...register(`vehicles.${idx}.model_id`)}>
                      <option value="">—</option>
                      {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Cor</label>
                  <div className="select-wrapper">
                    <select className="form-select" {...register(`vehicles.${idx}.color_id`)}>
                      <option value="">—</option>
                      {colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={isLoading}
        style={{ marginTop: 8 }}>
        {isLoading
          ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Salvando…</>
          : 'Salvar'}
      </button>
    </form>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Detail panel
// ──────────────────────────────────────────────────────────────────────────────

function DetailPanel({ sub, onClose }: { sub: SubscriberDetail; onClose: () => void }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [addVehicle, setAddVehicle] = useState(false)
  const [addPayment, setAddPayment] = useState(false)

  const { data: colors = [] } = useQuery<Color[]>({ queryKey: ['colors'], queryFn: getColors, staleTime: Infinity })
  const { data: models = [] } = useQuery<VehicleModel[]>({ queryKey: ['models'], queryFn: getModels, staleTime: Infinity })

  const {
    register: regV, handleSubmit: hsV,
    formState: { errors: errorsV },
  } = useForm<{ plate: string; model_id?: number; color_id?: number }>()

  const {
    register: regP, handleSubmit: hsP,
    formState: { errors: errorsP },
  } = useForm<{ amount: number; reference_month: string; payment_date: string; payment_method: string; notes?: string }>()

  // Pre-declare plate field for add vehicle modal so onChange can call both transform + RHF
  const plateAddField = regV('plate', {
    required: 'Placa obrigatória',
    validate: (v) => {
      const p = v.toUpperCase().trim()
      return PLATE_MERCOSUL.test(p) || PLATE_OLD.test(p) || 'Placa inválida. Use AAA0000 ou AAA0A00'
    },
  })

  const addVehicleMut = useMutation({
    mutationFn: (d: { plate: string; model_id?: number; color_id?: number }) =>
      addSubscriberVehicle(sub.id, { plate: d.plate.toUpperCase(), model_id: d.model_id ? Number(d.model_id) : undefined, color_id: d.color_id ? Number(d.color_id) : undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriber', sub.id] })
      qc.invalidateQueries({ queryKey: ['subscribers'] })
      toast('Veículo adicionado', 'success')
      setAddVehicle(false)
    },
  })

  const removeVehicleMut = useMutation({
    mutationFn: (vid: number) => removeSubscriberVehicle(sub.id, vid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriber', sub.id] })
      toast('Veículo removido', 'success')
    },
  })

  const paymentMut = useMutation({
    mutationFn: (d: { amount: number; reference_month: string; payment_date: string; payment_method: string; notes?: string }) =>
      registerSubscriberPayment(sub.id, { ...d, amount: Number(d.amount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriber', sub.id] })
      qc.invalidateQueries({ queryKey: ['subscribers'] })
      toast('Pagamento registrado', 'success')
      setAddPayment(false)
    },
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 90, display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border-light)', width: '100%', maxWidth: 440, height: '100%', overflowY: 'auto', padding: 24, animation: 'modal-up 0.3s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: 22, fontWeight: 900, letterSpacing: '0.03em' }}>{sub.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{fmtCPF(sub.cpf)}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge status={sub.status} />
              <span className="badge badge-regular" style={{ borderColor: 'var(--border)' }}>Vence dia {sub.due_day}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div className="card" style={{ padding: 12 }}>
            <div className="stat-label">Telefone</div>
            <div style={{ fontSize: 13, marginTop: 2 }}>{fmtPhone(sub.phone)}</div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div className="stat-label">E-mail</div>
            <div style={{ fontSize: 13, marginTop: 2, wordBreak: 'break-all' }}>{sub.email ?? '—'}</div>
          </div>
        </div>

        {/* Address */}
        {(sub.street || sub.neighborhood || sub.city) && (
          <div className="card" style={{ padding: 12, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <MapPin size={13} color="var(--amber)" />
              <span className="stat-label" style={{ margin: 0 }}>Endereço</span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              {sub.street && (
                <div>
                  {sub.street}{sub.number ? `, ${sub.number}` : ''}{sub.complement ? ` — ${sub.complement}` : ''}
                </div>
              )}
              {sub.neighborhood && <div>{sub.neighborhood}</div>}
              {(sub.city || sub.state) && (
                <div>{[sub.city, sub.state].filter(Boolean).join(' — ')}</div>
              )}
              {sub.zip_code && (
                <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>CEP {sub.zip_code}</div>
              )}
            </div>
          </div>
        )}

        {/* Vehicles */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="card-title">Veículos</div>
            <button className="btn btn-secondary btn-sm" onClick={() => setAddVehicle(true)}>
              <Plus size={14} /> Adicionar
            </button>
          </div>
          {sub.vehicles.length === 0
            ? <div className="text-muted" style={{ fontSize: 13 }}>Nenhum veículo cadastrado</div>
            : sub.vehicles.map((v) => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="td-plate">{v.plate}</div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeVehicleMut.mutate(v.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          }
        </div>

        {/* Payments */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="card-title">Pagamentos</div>
            <button className="btn btn-secondary btn-sm" onClick={() => setAddPayment(true)}>
              <DollarSign size={14} /> Registrar
            </button>
          </div>
          {sub.payments.length === 0
            ? <div className="text-muted" style={{ fontSize: 13 }}>Sem histórico de pagamentos</div>
            : sub.payments.slice(0, 6).map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {new Date(p.reference_month + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p.payment_method}</div>
                </div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
                  R$ {Number(p.amount).toFixed(2).replace('.', ',')}
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Add vehicle modal — key forces remount on each open */}
      <Modal open={addVehicle} onClose={() => setAddVehicle(false)} title="Adicionar Veículo">
        <form key={String(addVehicle)} onSubmit={hsV((d) => addVehicleMut.mutate(d))}>
          <div className="form-group">
            <label className="form-label">Placa *</label>
            <input
              ref={plateAddField.ref}
              name={plateAddField.name}
              onBlur={plateAddField.onBlur}
              className={`plate-input w-full ${errorsV.plate ? 'error' : ''}`}
              style={{ fontSize: 18 }}
              placeholder="ABC1D23"
              maxLength={8}
              autoCapitalize="characters"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase()
                plateAddField.onChange(e)
              }}
            />
            {errorsV.plate && <span className="form-error"><AlertCircle size={12} />{errorsV.plate.message}</span>}
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Modelo</label>
              <div className="select-wrapper">
                <select className="form-select" {...regV('model_id')}>
                  <option value="">—</option>
                  {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Cor</label>
              <div className="select-wrapper">
                <select className="form-select" {...regV('color_id')}>
                  <option value="">—</option>
                  {colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={addVehicleMut.isPending}>
            {addVehicleMut.isPending ? 'Salvando…' : 'Salvar Veículo'}
          </button>
        </form>
      </Modal>

      {/* Add payment modal — key forces remount on each open */}
      <Modal open={addPayment} onClose={() => setAddPayment(false)} title="Registrar Pagamento">
        <form key={String(addPayment)} onSubmit={hsP((d) => paymentMut.mutate(d))}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Valor (R$) *</label>
              <input type="number" step="0.01" min="0.01" max="99999.99"
                className={`form-input ${errorsP.amount ? 'error' : ''}`}
                {...regP('amount', {
                  required: 'Valor obrigatório',
                  min: { value: 0.01, message: 'Valor deve ser maior que zero' },
                  max: { value: 99999.99, message: 'Máximo R$ 99.999,99' },
                  valueAsNumber: true,
                })} />
              {errorsP.amount && <span className="form-error"><AlertCircle size={12} />{errorsP.amount.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Mês referência *</label>
              <input type="month" className={`form-input ${errorsP.reference_month ? 'error' : ''}`}
                {...regP('reference_month', { required: 'Obrigatório' })} />
              {errorsP.reference_month && <span className="form-error"><AlertCircle size={12} />{errorsP.reference_month.message}</span>}
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Data pagamento *</label>
              <input type="date" className={`form-input ${errorsP.payment_date ? 'error' : ''}`}
                defaultValue={new Date().toISOString().split('T')[0]}
                {...regP('payment_date', { required: 'Obrigatório' })} />
              {errorsP.payment_date && <span className="form-error"><AlertCircle size={12} />{errorsP.payment_date.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Forma de Pag.</label>
              <div className="select-wrapper">
                <select className="form-select" defaultValue="pix"
                  {...regP('payment_method', { required: true })}>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="credito">Crédito</option>
                  <option value="debito">Débito</option>
                  <option value="pix">PIX</option>
                </select>
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <input className={`form-input ${errorsP.notes ? 'error' : ''}`}
              maxLength={500}
              {...regP('notes', { maxLength: { value: 500, message: 'Máximo 500 caracteres' } })} />
            {errorsP.notes && <span className="form-error"><AlertCircle size={12} />{errorsP.notes.message}</span>}
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={paymentMut.isPending}>
            {paymentMut.isPending ? 'Salvando…' : 'Registrar Pagamento'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────────

export default function Subscribers() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)

  const { data: subscribers = [], isLoading } = useQuery<Subscriber[]>({
    queryKey: ['subscribers'],
    queryFn: getSubscribers,
  })

  const { data: detail } = useQuery<SubscriberDetail>({
    queryKey: ['subscriber', detailId],
    queryFn: () => getSubscriber(detailId!),
    enabled: detailId !== null,
  })

  const createMut = useMutation({
    mutationFn: async (d: SubFormData) => {
      const sub = await createSubscriber({
        name: d.name,
        cpf: d.cpf,
        phone: d.phone || undefined,
        email: d.email || undefined,
        due_day: d.due_day,
        zip_code: d.zip_code || undefined,
        street: d.street || undefined,
        number: d.number || undefined,
        complement: d.complement || undefined,
        neighborhood: d.neighborhood || undefined,
        city: d.city || undefined,
        state: d.state || undefined,
      })
      for (const v of d.vehicles) {
        if (v.plate) {
          await addSubscriberVehicle(sub.id, {
            plate: v.plate.toUpperCase(),
            model_id: v.model_id ? Number(v.model_id) : undefined,
            color_id: v.color_id ? Number(v.color_id) : undefined,
          })
        }
      }
      return sub
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscribers'] })
      toast('Mensalista criado', 'success')
      setCreateOpen(false)
    },
  })

  const overdueMut = useMutation({
    mutationFn: runOverdueCheck,
    onSuccess: (r) => toast(`Verificação concluída: ${r.marked_overdue} marcados como inadimplentes`, 'info'),
  })

  const filtered = subscribers
    .filter((s) => filterStatus === 'all' || s.status === filterStatus)
    .filter((s) => {
      const q = search.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.cpf.includes(q)
    })

  const counts = {
    all: subscribers.length,
    active: subscribers.filter((s) => s.status === 'active').length,
    overdue: subscribers.filter((s) => s.status === 'overdue').length,
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Mensalistas</div>
          <div className="page-subtitle">{subscribers.length} cadastrados</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => overdueMut.mutate()} disabled={overdueMut.isPending}>
            <RefreshCw size={14} className={overdueMut.isPending ? 'spinning' : ''} />
            Verificar Inadimplência
          </button>
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Novo
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="seg-control mb-16" style={{ maxWidth: 340 }}>
        {(['all', 'active', 'overdue'] as const).map((s) => (
          <button key={s} className={`seg-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
            {s === 'all' ? `Todos (${counts.all})` : s === 'active' ? `Ativos (${counts.active})` : `Inadimp. (${counts.overdue})`}
          </button>
        ))}
      </div>

      <div className="search-bar mb-16">
        <Search size={16} />
        <input type="text" placeholder="Buscar por nome ou CPF…" value={search}
          onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /> Carregando…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Search size={36} />
          <div className="empty-state-title">Nenhum resultado</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>Dia Venc.</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => setDetailId(s.id)}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td className="mono" style={{ fontSize: 13 }}>{fmtCPF(s.cpf)}</td>
                  <td>{fmtPhone(s.phone)}</td>
                  <td className="text-center">{s.due_day}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td><ChevronRight size={16} color="var(--text-dim)" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal — key forces SubscriberForm to remount on each open */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Novo Mensalista">
        <SubscriberForm
          key={String(createOpen)}
          onSubmit={(d) => createMut.mutate(d)}
          isLoading={createMut.isPending}
        />
      </Modal>

      {/* Detail panel */}
      {detail && detailId !== null && (
        <DetailPanel sub={detail} onClose={() => setDetailId(null)} />
      )}

      <style>{`.spinning { animation: spin 1s linear infinite; }`}</style>
    </div>
  )
}
