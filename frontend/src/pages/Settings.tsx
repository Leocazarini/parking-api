import { useEffect } from 'react'
import { fmtDuration } from '../utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Save, Clock, DollarSign, AlertCircle } from 'lucide-react'
import { getConfig, updateConfig } from '../api/parking'
import { useToast } from '../hooks/useToast'
import type { ParkingConfig } from '../types'

interface ConfigForm {
  tolerance_minutes: number
  half_hour_rate: number
  hourly_rate: number
  additional_hour_rate: number
  daily_rate: number
}

function calcularPreview(mins: number, cfg: ParkingConfig): number {
  const tolerance = cfg.tolerance_minutes ?? 5
  const halfHour = Number(cfg.half_hour_rate)
  const hourly = Number(cfg.hourly_rate)
  const additional = Number(cfg.additional_hour_rate)
  const daily = Number(cfg.daily_rate)

  if (mins < tolerance) return 0
  if (mins < 30) return Math.min(halfHour, daily)
  if (mins < 60) return Math.min(hourly, daily)

  const additionalCompleteHours = Math.floor((mins - 60) / 60)
  return Math.min(hourly + additional * additionalCompleteHours, daily)
}

export default function Settings() {
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: config, isLoading } = useQuery<ParkingConfig>({
    queryKey: ['parking-config'],
    queryFn: getConfig,
  })

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<ConfigForm>()

  useEffect(() => {
    if (config) {
      reset({
        tolerance_minutes: config.tolerance_minutes,
        half_hour_rate: Number(config.half_hour_rate),
        hourly_rate: Number(config.hourly_rate),
        additional_hour_rate: Number(config.additional_hour_rate),
        daily_rate: Number(config.daily_rate),
      })
    }
  }, [config, reset])

  const mutation = useMutation({
    mutationFn: (d: ConfigForm) =>
      updateConfig({
        tolerance_minutes: d.tolerance_minutes,
        half_hour_rate: String(d.half_hour_rate),
        hourly_rate: String(d.hourly_rate),
        additional_hour_rate: String(d.additional_hour_rate),
        daily_rate: String(d.daily_rate),
      }),
    onSuccess: (updated) => {
      qc.setQueryData(['parking-config'], updated)
      toast('Configurações salvas com sucesso', 'success')
      reset({
        tolerance_minutes: updated.tolerance_minutes,
        half_hour_rate: Number(updated.half_hour_rate),
        hourly_rate: Number(updated.hourly_rate),
        additional_hour_rate: Number(updated.additional_hour_rate),
        daily_rate: Number(updated.daily_rate),
      })
    },
  })

  const watched = watch()

  const previewConfig: ParkingConfig = config
    ? {
        tolerance_minutes: watched.tolerance_minutes ?? config.tolerance_minutes,
        half_hour_rate: String(watched.half_hour_rate ?? config.half_hour_rate),
        hourly_rate: String(watched.hourly_rate ?? config.hourly_rate),
        additional_hour_rate: String(watched.additional_hour_rate ?? config.additional_hour_rate),
        daily_rate: String(watched.daily_rate ?? config.daily_rate),
      }
    : config!

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

          {/* Tolerância */}
          <div className="card mb-16">
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
              <span className="form-hint">Permanências abaixo deste tempo não são cobradas.</span>
            </div>
          </div>

          {/* Tarifas */}
          <div className="card mb-16">
            <div className="card-header">
              <div className="card-title">
                <DollarSign size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                Tarifas
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Meia hora (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999.99"
                  className={`form-input ${errors.half_hour_rate ? 'error' : ''}`}
                  {...register('half_hour_rate', {
                    required: 'Obrigatório',
                    min: { value: 0, message: 'Valor inválido' },
                    max: { value: 9999.99, message: 'Máximo R$ 9.999,99' },
                    valueAsNumber: true,
                  })}
                />
                {errors.half_hour_rate && (
                  <span className="form-error"><AlertCircle size={12} />{errors.half_hour_rate.message}</span>
                )}
                <span className="form-hint">até 29 min</span>
              </div>

              <div className="form-group">
                <label className="form-label">Primeira hora (R$)</label>
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
                <span className="form-hint">30 min até 59 min</span>
              </div>

              <div className="form-group">
                <label className="form-label">Hora adicional (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999.99"
                  className={`form-input ${errors.additional_hour_rate ? 'error' : ''}`}
                  {...register('additional_hour_rate', {
                    required: 'Obrigatório',
                    min: { value: 0, message: 'Valor inválido' },
                    max: { value: 9999.99, message: 'Máximo R$ 9.999,99' },
                    valueAsNumber: true,
                  })}
                />
                {errors.additional_hour_rate && (
                  <span className="form-error"><AlertCircle size={12} />{errors.additional_hour_rate.message}</span>
                )}
                <span className="form-hint">Adicionado a cada hora cheia após a 1ª</span>
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

          {/* Preview */}
          {config && previewConfig && (
            <div className="card mb-24" style={{ background: 'var(--surface-2)', borderStyle: 'dashed' }}>
              <div className="card-title" style={{ marginBottom: 12 }}>Exemplo de cobrança</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[3, 15, 45, 60, 90, 120, 180, 480].map((mins) => {
                  const charge = calcularPreview(mins, previewConfig)
                  const isFree = charge === 0
                  const isDaily = !isFree && charge === Number(previewConfig.daily_rate)
                  return (
                    <div key={mins} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{fmtDuration(mins)}</span>
                      <span className="mono" style={{ fontWeight: 700, color: isFree ? 'var(--green)' : isDaily ? 'var(--orange)' : 'var(--amber)' }}>
                        {isFree ? 'GRÁTIS' : charge.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        {isDaily && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>DIÁRIA</span>}
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
