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

export function formatTicket(id: number): string {
  return `#${String(id).padStart(5, '0')}`
}

/**
 * Força o blur de um input de data no mobile.
 *
 * Problema: no iOS Safari, após fechar o picker nativo de data, o input
 * permanece "focado" mesmo que `e.target.blur()` seja chamado — o browser
 * re-foca o input internamente, e ao rolar a página o navegador tenta manter
 * o input focado visível ("scroll into view"), causando o efeito de "snap back".
 *
 * Solução: setar `disabled = true` em um input focado FORÇA o browser a desfocar
 * por especificação HTML, e impede que o input seja re-focado enquanto disabled.
 * Restauramos em requestAnimationFrame (1 frame ~16ms) — imperceptível.
 *
 * Combinamos com tentativas adicionais com setTimeout para cobrir o caso onde
 * o iOS tenta re-focar após o requestAnimationFrame.
 */
export function blurDateInput(el: HTMLInputElement): void {
  el.blur()
  // Truque do disabled — força blur garantido por spec HTML
  el.disabled = true
  requestAnimationFrame(() => {
    el.disabled = false
  })
  // Safety net: tentativas adicionais caso iOS Safari tente re-focar
  for (const delay of [50, 150, 350]) {
    setTimeout(() => {
      if (document.activeElement === el) {
        el.blur()
      }
    }, delay)
  }
}
