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

// Patterns: [regex, friendly message]. Checked in order, first match wins.
const ERROR_PATTERNS: [RegExp, string][] = [
  // Auth
  [/credenciais inválidas/i,          'Usuário ou senha incorretos. Verifique os dados e tente novamente.'],
  [/token inválido ou expirado/i,     'Sua sessão expirou. Faça login novamente para continuar.'],
  [/usuário inativo/i,                'Esta conta está desativada. Entre em contato com o administrador.'],
  [/acesso restrito a administradores/i, 'Você não tem permissão para realizar esta ação.'],
  [/conta bloqueada/i,                'Muitas tentativas incorretas. Aguarde alguns instantes antes de tentar novamente.'],

  // Parking entries
  [/já possui entrada ativa/i,        'Este veículo já está no estacionamento. Verifique a lista de veículos presentes.'],
  [/entrada .* não encontrada ou já finalizada/i, 'Esta saída não pôde ser registrada — a entrada não foi encontrada ou já foi finalizada.'],
  [/configuração de estacionamento não encontrada/i, 'O estacionamento ainda não está configurado. Acesse as configurações para definir as tarifas.'],

  // Subscribers
  [/mensalista .* não encontrado/i,   'Mensalista não encontrado. Ele pode ter sido removido.'],
  [/veículo .* não encontrado/i,      'Veículo não encontrado. Atualize a página e tente novamente.'],
  [/cpf .* já cadastrado/i,           'Já existe um mensalista com este CPF. Verifique o cadastro existente.'],
  [/placa .* já cadastrada como veículo de mensalista/i, 'Esta placa já está vinculada a um mensalista.'],

  // Catalog
  [/cor .* não encontrada/i,          'A cor selecionada não existe. Atualize a página e tente novamente.'],
  [/modelo .* não encontrado/i,       'O modelo selecionado não existe. Atualize a página e tente novamente.'],
  [/cor .* está em uso/i,             'Esta cor não pode ser removida pois ainda está sendo usada.'],
  [/modelo .* está em uso/i,          'Este modelo não pode ser removido pois ainda está sendo utilizado.'],
  [/cor '.*' já cadastrada/i,         'Já existe uma cor com esse nome. Escolha um nome diferente.'],
  [/modelo '.*' já cadastrado/i,      'Já existe um modelo com esse nome. Escolha um nome diferente.'],

  // Users
  [/usuário \d+ não encontrado/i,     'Usuário não encontrado. Atualize a página e tente novamente.'],
  [/username '.*' já cadastrado/i,    'Este nome de usuário já está em uso. Escolha outro.'],
  [/email '.*' já cadastrado/i,       'Este e-mail já está cadastrado no sistema.'],

  // Financial
  [/end_date não pode ser anterior/i, 'A data final não pode ser anterior à data inicial.'],
]

const STATUS_MESSAGES: Record<number, { title: string; message: string }> = {
  0:   { title: 'Sem conexão',            message: 'Não foi possível se comunicar com o servidor. Verifique sua internet e tente novamente.' },
  400: { title: 'Dados inválidos',         message: 'As informações enviadas estão incorretas. Verifique os campos e tente novamente.' },
  403: { title: 'Acesso negado',           message: 'Você não tem permissão para realizar esta ação.' },
  404: { title: 'Não encontrado',          message: 'O item solicitado não foi encontrado. Atualize a página e tente novamente.' },
  409: { title: 'Registro duplicado',      message: 'Já existe um cadastro com essas informações no sistema.' },
  422: { title: 'Campos inválidos',        message: 'Alguns campos estão com informações inválidas. Verifique e corrija antes de continuar.' },
  429: { title: 'Muitas tentativas',       message: 'Você fez muitas tentativas em pouco tempo. Aguarde um momento e tente novamente.' },
  500: { title: 'Erro no servidor',        message: 'Ocorreu um problema interno. Tente novamente em instantes.' },
  502: { title: 'Servidor indisponível',   message: 'O servidor está temporariamente fora do ar. Tente novamente em alguns instantes.' },
  503: { title: 'Serviço indisponível',    message: 'O serviço está temporariamente fora do ar. Tente novamente em breve.' },
}

function translateDetail(raw: string): string {
  for (const [pattern, friendly] of ERROR_PATTERNS) {
    if (pattern.test(raw)) return friendly
  }
  return ''
}

function parseError(status: number, data: unknown): ParsedError {
  if (status === 0) {
    return { status, title: STATUS_MESSAGES[0].title, message: STATUS_MESSAGES[0].message }
  }

  const fallback = STATUS_MESSAGES[status] ?? {
    title: `Erro ${status}`,
    message: 'Ocorreu um erro inesperado. Tente novamente ou contate o suporte.',
  }

  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>

    if (typeof d.detail === 'string') {
      const friendly = translateDetail(d.detail)
      return { status, title: fallback.title, message: friendly || fallback.message }
    }

    if (Array.isArray(d.detail)) {
      // Pydantic validation errors — always show a generic friendly message
      return { status, title: fallback.title, message: fallback.message }
    }
  }

  return { status, title: fallback.title, message: fallback.message }
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
