import { useState, useEffect, useRef, useCallback } from 'react'
import { X, AlertTriangle, WifiOff } from 'lucide-react'

interface ApiErrorDetail {
  status: number
  data: unknown
}

interface ParsedError {
  status: number
  title: string
  message: string
}

const STATUS_TITLES: Record<number, string> = {
  0:   'Sem conexão com o servidor',
  400: 'Requisição inválida',
  403: 'Acesso negado',
  404: 'Recurso não encontrado',
  409: 'Conflito de dados',
  422: 'Dados inválidos',
  429: 'Muitas requisições — aguarde',
  500: 'Erro interno do servidor',
  502: 'Serviço indisponível',
  503: 'Serviço indisponível',
}

function parseError(status: number, data: unknown): ParsedError {
  const title = STATUS_TITLES[status] ?? `Erro ${status}`

  if (status === 0) {
    return {
      status,
      title,
      message: 'Não foi possível se comunicar com o servidor. Verifique sua conexão e tente novamente.',
    }
  }

  let message = 'Ocorreu um erro inesperado. Tente novamente ou contate o suporte.'

  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if (typeof d.detail === 'string') {
      message = d.detail
    } else if (Array.isArray(d.detail)) {
      message = (d.detail as Array<{ msg?: string; loc?: string[] }>)
        .map((e) => {
          const field = e.loc?.filter((s) => s !== 'body').slice(-1)[0]
          return field ? `${field}: ${e.msg}` : (e.msg ?? '')
        })
        .filter(Boolean)
        .join('\n')
    }
  }

  return { status, title, message }
}

export function ErrorModal() {
  const [error, setError] = useState<ParsedError | null>(null)
  const lastRef = useRef<{ status: number; message: string; time: number } | null>(null)

  const handleEvent = useCallback((e: Event) => {
    const { status, data } = (e as CustomEvent<ApiErrorDetail>).detail
    const parsed = parseError(status, data)

    // Dedup: mesmo erro nos últimos 2s (evita duplo disparo por retries)
    const now = Date.now()
    if (
      lastRef.current &&
      lastRef.current.status === status &&
      lastRef.current.message === parsed.message &&
      now - lastRef.current.time < 2000
    ) return

    lastRef.current = { status, message: parsed.message, time: now }
    setError(parsed)
  }, [])

  useEffect(() => {
    window.addEventListener('api:error', handleEvent)
    return () => window.removeEventListener('api:error', handleEvent)
  }, [handleEvent])

  useEffect(() => {
    if (!error) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setError(null) }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [error])

  if (!error) return null

  const isNetwork = error.status === 0

  return (
    <div
      onClick={() => setError(null)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(244, 63, 94, 0.06)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        animation: 'overlay-in 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--red-border)',
          borderRadius: 16,
          padding: '28px 28px 24px',
          maxWidth: 440,
          width: '100%',
          boxShadow: '0 0 0 4px rgba(244,63,94,0.08), 0 24px 64px rgba(0,0,0,0.4)',
          animation: 'modal-up 0.25s cubic-bezier(0.16,1,0.3,1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Faixa vermelha no topo */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 3,
          background: 'var(--red)',
          borderRadius: '16px 16px 0 0',
        }} />

        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--red-bg)',
              border: '1px solid var(--red-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {isNetwork
                ? <WifiOff size={18} color="var(--red)" />
                : <AlertTriangle size={18} color="var(--red)" />}
            </div>
            <div>
              <div style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: 19,
                fontWeight: 900,
                letterSpacing: '0.03em',
                color: 'var(--red)',
                lineHeight: 1.1,
              }}>
                {error.title}
              </div>
              {error.status > 0 && (
                <div style={{
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginTop: 2,
                  letterSpacing: '0.06em',
                }}>
                  HTTP {error.status}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setError(null)}
            style={{
              width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--red-bg)',
              border: '1px solid var(--red-border)',
              borderRadius: '50%',
              color: 'var(--red)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 150ms ease',
            }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Mensagem */}
        <div style={{
          background: 'var(--red-bg)',
          border: '1px solid var(--red-border)',
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 20,
        }}>
          <p style={{
            fontSize: 14,
            color: 'var(--text)',
            lineHeight: 1.6,
            margin: 0,
            whiteSpace: 'pre-line',
          }}>
            {error.message}
          </p>
        </div>

        {/* Ação */}
        <button
          onClick={() => setError(null)}
          style={{
            width: '100%',
            padding: '10px 0',
            background: 'var(--red-bg)',
            border: '1px solid var(--red-border)',
            borderRadius: 8,
            color: 'var(--red)',
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(244,63,94,0.18)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--red-bg)' }}
        >
          Entendido
        </button>
      </div>
    </div>
  )
}
