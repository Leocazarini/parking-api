import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle, AlertTriangle, Car, ChevronRight, Search, Check } from 'lucide-react'
import { registerEntry } from '../api/parking'
import { getColors, getModels } from '../api/catalog'
import { useToast } from '../hooks/useToast'
import { StatusBadge } from '../components/StatusBadge'
import type { Color, VehicleModel, EntryResponse } from '../types'

const PLATE_MERCOSUL = /^[A-Z]{3}[0-9][A-F][0-9]{2}$/
const PLATE_OLD = /^[A-Z]{3}[0-9]{4}$/

const COLOR_HEX: Record<string, string> = {
  Branco: '#F8F9FA', Prata: '#9CA3AF', Preto: '#1F2937', Cinza: '#6B7280',
  Vermelho: '#EF4444', Azul: '#3B82F6', Verde: '#10B981', Amarelo: '#F59E0B',
  Laranja: '#F97316', Marrom: '#92400E', Bege: '#D4B896', Vinho: '#7C3040',
  Dourado: '#D97706', Rosa: '#EC4899', Lilás: '#A78BFA',
}

interface EntryForm {
  plate: string
  color_id: number
  model_id?: number
}

// ── Lista pesquisável reutilizável ──────────────────────────────────────────
interface ListItem { id: number; name: string; hex?: string }

function SearchableList({
  items,
  selected,
  onSelect,
  placeholder,
  hasError,
}: {
  items: ListItem[]
  selected: number | null
  onSelect: (id: number) => void
  placeholder: string
  hasError?: boolean
}) {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  const selectedItem = selected ? items.find((i) => i.id === selected) ?? null : null

  useEffect(() => {
    if (!selected) setCollapsed(false)
  }, [selected])

  const filtered = search.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : []

  const handleSelect = (id: number) => {
    onSelect(id)
    setCollapsed(true)
    setSearch('')
  }

  const handleExpand = () => {
    setCollapsed(false)
    setSearch('')
  }

  if (collapsed && selectedItem) {
    return (
      <div
        className={`searchable-list-box ${hasError ? 'error' : ''}`}
        style={{ cursor: 'pointer' }}
        onClick={handleExpand}
      >
        <div className="searchable-list-item selected" style={{ margin: 0, borderRadius: 6 }}>
          {selectedItem.hex !== undefined && (
            <span className="sli-dot" style={{ background: selectedItem.hex || '#6B7280' }} />
          )}
          <span className="sli-name">{selectedItem.name}</span>
          <Check size={14} className="sli-check" style={{ opacity: 1 }} />
        </div>
      </div>
    )
  }

  return (
    <div className={`searchable-list-box ${hasError ? 'error' : ''}`}>
      <div className="searchable-list-search">
        <Search size={14} />
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
          autoFocus={collapsed === false && selectedItem !== null}
        />
      </div>
      <div className="searchable-list">
        {!search.trim() ? (
          <div className="sli-empty">Digite para buscar…</div>
        ) : filtered.length === 0 ? (
          <div className="sli-empty">Nenhum resultado</div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={`searchable-list-item ${selected === item.id ? 'selected' : ''}`}
              onClick={() => handleSelect(item.id)}
            >
              {item.hex !== undefined && (
                <span
                  className="sli-dot"
                  style={{ background: item.hex || '#6B7280' }}
                />
              )}
              <span className="sli-name">{item.name}</span>
              <Check size={14} className="sli-check" />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Página ──────────────────────────────────────────────────────────────────
export default function Entry() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [result, setResult] = useState<EntryResponse | null>(null)

  const { data: colors = [] } = useQuery<Color[]>({
    queryKey: ['colors'],
    queryFn: getColors,
    staleTime: Infinity,
  })

  const { data: models = [] } = useQuery<VehicleModel[]>({
    queryKey: ['models'],
    queryFn: getModels,
    staleTime: Infinity,
  })

  const colorItems: ListItem[] = colors.map((c) => ({
    id: c.id,
    name: c.name,
    hex: COLOR_HEX[c.name] ?? '#6B7280',
  }))

  const modelItems: ListItem[] = models.map((m) => ({
    id: m.id,
    name: m.name,
  }))

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EntryForm>({ defaultValues: { plate: '', color_id: 0, model_id: undefined } })

  const plateValue = watch('plate', '')
  const selectedColor = watch('color_id', 0)
  const selectedModel = watch('model_id')

  const mutation = useMutation({
    mutationFn: ({ plate, color_id }: EntryForm) =>
      registerEntry(plate, Number(color_id)),
    onSuccess: (data) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ['active-entries'] })
      toast(`Entrada registrada: ${data.plate}`, 'success')
    },
  })

  const handleNew = () => {
    setResult(null)
    reset()
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

            <div className="vehicle-plate" style={{ fontSize: 32, marginBottom: 16 }}>{result.plate}</div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
              <StatusBadge status={result.client_type} />
              {result.subscriber_status && result.subscriber_status !== 'active' && (
                <StatusBadge status={result.subscriber_status} />
              )}
            </div>

            {result.subscriber_status === 'overdue' && (
              <div className="overdue-alert mb-16">
                <AlertTriangle size={16} />
                CLIENTE INADIMPLENTE — Verificar situação antes de liberar
              </div>
            )}

            {result.subscriber_status === 'active' && result.subscriber_name && (
              <div className="subscriber-alert mb-16">
                <Car size={16} />
                Mensalista: <strong style={{ marginLeft: 4 }}>{result.subscriber_name}</strong>
              </div>
            )}

            <div className="text-muted" style={{ fontSize: 13, marginBottom: 24 }}>
              Entrada registrada às {new Date(result.entry_at).toLocaleTimeString('pt-BR')}
            </div>

            <button className="btn btn-primary btn-lg w-full" onClick={handleNew}>
              Registrar Nova Entrada
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div>
            <div className="page-title">Registrar Entrada</div>
            <div className="page-subtitle">Novo veículo no pátio</div>
          </div>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>

            {/* Placa */}
            <div className="form-group mb-20">
              <label className="form-label">Placa do Veículo</label>
              <Controller
                name="plate"
                control={control}
                rules={{
                  required: 'Informe a placa',
                  validate: (v) => {
                    const p = v.toUpperCase().trim()
                    return PLATE_MERCOSUL.test(p) || PLATE_OLD.test(p)
                      ? true
                      : 'Placa inválida. Use AAA0000 ou AAA0A00'
                  },
                }}
                render={({ field }) => (
                  <input
                    {...field}
                    className={`plate-input w-full ${errors.plate ? 'error' : ''}`}
                    placeholder="ABC1D23"
                    maxLength={8}
                    autoComplete="off"
                    autoCapitalize="characters"
                    onChange={(e) =>
                      field.onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                    }
                  />
                )}
              />
              {errors.plate ? (
                <span className="form-error"><AlertCircle size={12} />{errors.plate.message}</span>
              ) : plateValue.length > 0 ? (
                <span className="form-hint" style={{ color: (PLATE_MERCOSUL.test(plateValue) || PLATE_OLD.test(plateValue)) ? 'var(--green)' : 'var(--text-muted)' }}>
                  {(PLATE_MERCOSUL.test(plateValue) || PLATE_OLD.test(plateValue))
                    ? '✓ Placa válida'
                    : 'Digite 7 caracteres: AAA0000 ou AAA0A00'}
                </span>
              ) : null}
            </div>

            {/* Cor */}
            <div className="form-group mb-20">
              <label className="form-label">
                Cor do Veículo
                {selectedColor > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    marginLeft: 8, fontWeight: 600,
                    color: 'var(--amber)', fontSize: 11,
                  }}>
                    <span
                      style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: COLOR_HEX[colors.find(c => c.id === Number(selectedColor))?.name ?? ''] ?? '#6B7280',
                        display: 'inline-block',
                      }}
                    />
                    {colors.find(c => c.id === Number(selectedColor))?.name}
                  </span>
                )}
              </label>
              <Controller
                name="color_id"
                control={control}
                rules={{ required: 'Selecione uma cor', validate: (v) => Number(v) > 0 || 'Selecione uma cor' }}
                render={({ field }) => (
                  <SearchableList
                    items={colorItems}
                    selected={Number(field.value) || null}
                    onSelect={(id) => field.onChange(id)}
                    placeholder="Buscar cor…"
                    hasError={!!errors.color_id}
                  />
                )}
              />
              {errors.color_id && (
                <span className="form-error"><AlertCircle size={12} />{errors.color_id.message}</span>
              )}
            </div>

            {/* Modelo */}
            <div className="form-group mb-24">
              <label className="form-label">
                Modelo do Veículo
                <span style={{ fontWeight: 400, color: 'var(--text-dim)', fontSize: 10, marginLeft: 6, letterSpacing: '0.06em' }}>
                  OPCIONAL
                </span>
                {selectedModel && (
                  <span style={{ marginLeft: 8, fontWeight: 600, color: 'var(--amber)', fontSize: 11 }}>
                    {models.find(m => m.id === Number(selectedModel))?.name}
                  </span>
                )}
              </label>
              <Controller
                name="model_id"
                control={control}
                render={({ field }) => (
                  <SearchableList
                    items={modelItems}
                    selected={field.value ? Number(field.value) : null}
                    onSelect={(id) => {
                      // toggle: clicar no mesmo item desmarca
                      if (Number(field.value) === id) {
                        field.onChange(undefined)
                        setValue('model_id', undefined)
                      } else {
                        field.onChange(id)
                      }
                    }}
                    placeholder="Buscar modelo…"
                  />
                )}
              />
              <span className="form-hint">
                Para mensalistas, o modelo é preenchido automaticamente pelo sistema.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-xl w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <><div className="spinner" style={{ width: 20, height: 20 }} /> Registrando…</>
              ) : (
                <>REGISTRAR ENTRADA <ChevronRight size={20} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
