/** Formata uma duração em minutos para exibição.
 *  0-59 min  → "45min"
 *  60+ min   → "1:05h", "2:30h", etc.
 */
export function fmtDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return `${h}:${String(rem).padStart(2, '0')}h`
}

/**
 * Parseia timestamp da API como UTC.
 * O backend retorna datetimes sem sufixo de timezone (ex: "2026-04-27T11:10:00").
 * Sem tratamento, o JS interpreta como horário local (UTC-3), causando tempos negativos.
 */
export function parseApiDate(s: string): Date {
  return new Date(/Z$|[+-]\d{2}:\d{2}$/.test(s) ? s : s + 'Z')
}
