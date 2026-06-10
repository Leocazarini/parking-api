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
 * Força o blur de um input de data após a seleção.
 *
 * Problema: após fechar o picker nativo, alguns navegadores (iOS Safari e
 * também Chrome Android em certos casos) re-focam o input automaticamente.
 * Com o input focado, o browser tenta mantê-lo visível ("scroll into view"),
 * causando o efeito de "snap back" quando o usuário tenta rolar a página.
 *
 * Solução em duas camadas:
 * 1. Disabled trick: setar `disabled = true` em um input focado FORÇA blur
 *    por spec HTML. Restauramos em requestAnimationFrame (~16ms).
 * 2. Transferir foco para o body. O `blur()` sozinho não impede o browser
 *    de re-focar o input; movendo o foco explicitamente para outro
 *    elemento, deixamos claro que o foco deve ficar fora do input.
 *    `preventScroll: true` evita que o foco no body cause scroll.
 *
 * Não usamos setTimeouts para re-blurar — eles competem com cliques do
 * usuário e podem fechar o picker quando ele tenta reabrir.
 */
export function blurDateInput(el: HTMLInputElement): void {
  el.blur()
  // Camada 1: truque do disabled — força blur garantido por spec HTML
  el.disabled = true
  requestAnimationFrame(() => {
    el.disabled = false
  })
  // Camada 2: move o foco para body, impedindo re-foco automático no input.
  // body precisa de tabindex para ser focável; restauramos o estado anterior
  // no próximo frame para não afetar navegação por teclado.
  const body = document.body
  if (!body) return
  const hadTabIndex = body.hasAttribute('tabindex')
  if (!hadTabIndex) body.setAttribute('tabindex', '-1')
  body.focus({ preventScroll: true })
  if (!hadTabIndex) {
    requestAnimationFrame(() => body.removeAttribute('tabindex'))
  }
}

/**
 * Abre o picker nativo de data ao tocar/clicar no input.
 *
 * Anexado em `onFocus` E `onClick` por motivos distintos:
 * - `onFocus`: cobre o primeiro toque, quando o input ainda não está focado.
 *   Em alguns browsers (notadamente Chrome Android), o `click` que segue o
 *   `focus` inicial não consegue abrir o picker de forma confiável.
 * - `onClick`: cobre os toques seguintes, quando o input já está focado e
 *   `focus` não dispara de novo (ex: usuário fechou o picker com back e tocou
 *   no mesmo input).
 *
 * Chamadas duplicadas são seguras: `showPicker()` lança em estado inválido
 * (ex: picker já aberto, sem ativação de usuário), e o `catch` engole.
 * Navegação por teclado (Tab) não carrega ativação, então o picker não abre
 * sozinho ao tabular — comportamento desejado no desktop.
 */
export function openDatePicker(e: { currentTarget: HTMLInputElement }): void {
  try { e.currentTarget.showPicker() } catch { /* picker já aberto ou sem ativação */ }
}
