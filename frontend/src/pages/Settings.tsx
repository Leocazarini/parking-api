import { useEffect } from 'react'
import { fmtDuration } from '../utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Save, Clock, DollarSign, AlertCircle } from 'lucide-react'
import { getConfig, updateConfig } from '../api/parking'
import { useToast } from '../hooks/useToast'
import type { ParkingConfig } from '../types'

interface ConfigForm {
  hourly_rate: number
  daily_rate: number
  tolerance_minutes: number
}

export default function Settings() {
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: config, isLoading } = useQuery<ParkingConfig>({
    queryKey: ['parking-config'],
    queryFn: getConfig,
  })

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ConfigForm>()

  useEffect(() => {
    if (config) {
      reset({
        hourly_rate: Number(config.hourly_rate),
        daily_rate: Number(config.daily_rate),
        tolerance_minutes: config.tolerance_minutes,
      })
    }
  }, [config, reset])

  const mutation = useMutation({
    mutationFn: (d: ConfigForm) =>
      updateConfig({
        hourly_rate: String(d.hourly_rate),
        daily_rate: String(d.daily_rate),
        tolerance_minutes: d.tolerance_minutes,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(['parking-config'], updated)
      toast('Configurações salvas com sucesso', 'success')
      reset({
        hourly_rate: Number(updated.hourly_rate),
        daily_rate: Number(updated.daily_rate),
        tolerance_minutes: updated.tolerance_minutes,
      })
    },
  })

  if (isLoading) {
    return <div className="loading-center"><div className="spinner" /> Carregando…</div>
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Configurações</div>
          <div className="page-subtitle">Parâmetros de cobrança do estacionamento</div>
        </div>
      </div>

      <div style={{ maxWidth: 540, margin: '0 auto' }}>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="card mb-16">
            <div className="card-header">
              <div className="card-title">
                <DollarSign size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                Tarifas
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Valor por hora (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999.99"
                  className={`form-input ${errors.hourly_rate ? 'error' : ''}`}
                  {...register('hourly_rate', {
                    required: 'Obrigatório',
                    min: { value: 0, message: 'Valor inválido' },
                    max: { value: 9999.99, message: 'Máximo R$ 9.999,99' },
                    valueAsNumber: true,
                  })}
                />
                {errors.hourly_rate && (
                  <span className="form-error"><AlertCircle size={12} />{errors.hourly_rate.message}</span>
                )}
                <span className="form-hint">Cobrado proporcionalmente por hora</span>
              </div>

              <div className="form-group">
                <label className="form-label">Diária máxima (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999.99"
                  className={`form-input ${errors.daily_rate ? 'error' : ''}`}
                  {...register('daily_rate', {
                    required: 'Obrigatório',
                    min: { value: 0, message: 'Valor inválido' },
                    max: { value: 9999.99, message: 'Máximo R$ 9.999,99' },
                    valueAsNumber: true,
                  })}
                />
                {errors.daily_rate && (
                  <span className="form-error"><AlertCircle size={12} />{errors.daily_rate.message}</span>
                )}
                <span className="form-hint">Teto máximo cobrado por acesso</span>
              </div>
            </div>
          </div>

          <div className="card mb-24">
            <div className="card-header">
              <div className="card-title">
                <Clock size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                Tolerância
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tempo de tolerância (minutos)</label>
              <input
                type="number"
                min="0"
                max="60"
                className={`form-input ${errors.tolerance_minutes ? 'error' : ''}`}
                style={{ maxWidth: 160 }}
                {...register('tolerance_minutes', {
                  required: 'Obrigatório',
                  min: { value: 0, message: 'Mínimo 0' },
                  max: { value: 60, message: 'Máximo 60 min' },
                  valueAsNumber: true,
                })}
              />
              {errors.tolerance_minutes && (
                <span className="form-error"><AlertCircle size={12} />{errors.tolerance_minutes.message}</span>
              )}
              <span className="form-hint">
                Permanências ≤ a este tempo são cobradas R$ 0,00. Padrão: 5 minutos.
              </span>
            </div>
          </div>

          {/* Preview card */}
          {config && (
            <div className="card mb-24" style={{ background: 'var(--surface-2)', borderStyle: 'dashed' }}>
              <div className="card-title" style={{ marginBottom: 12 }}>Exemplo de cobrança</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[15, 60, 90, 180, 480].map((mins) => {
                  const isInTolerance = mins <= (config.tolerance_minutes ?? 5)
                  const hours = mins / 60
                  const charge = isInTolerance ? 0 : Math.min(hours * Number(config.hourly_rate), Number(config.daily_rate))
                  return (
                    <div key={mins} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {fmtDuration(mins)}
                      </span>
                      <span className="mono" style={{ fontWeight: 700, color: isInTolerance ? 'var(--green)' : charge === Number(config.daily_rate) ? 'var(--orange)' : 'var(--amber)' }}>
                        {isInTolerance ? 'GRÁTIS' : charge.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        {charge === Number(config.daily_rate) && !isInTolerance && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>DIÁRIA</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={mutation.isPending || !isDirty}
          >
            {mutation.isPending ? (
              <><div className="spinner" style={{ width: 18, height: 18 }} /> Salvando…</>
            ) : (
              <><Save size={18} /> Salvar Configurações</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
