import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Car, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'

interface LoginForm {
  username: string
  password: string
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response: { status: number; data?: { detail?: string } } }).response
    if (res.status === 423) return 'Conta bloqueada por tentativas excessivas. Tente novamente mais tarde.'
    if (res.status === 401) return 'Usuário ou senha incorretos.'
    if (res.status === 429) return 'Muitas tentativas. Aguarde antes de tentar novamente.'
    return res.data?.detail ?? 'Erro ao fazer login.'
  }
  return 'Erro de conexão com o servidor.'
}

export default function Login() {
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [showPwd, setShowPwd] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setApiError(null)
    try {
      await login(data.username, data.password)
      toast('Bem-vindo de volta!', 'success')
      navigate('/yard')
    } catch (err) {
      setApiError(getErrorMessage(err))
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <Car size={28} strokeWidth={2.5} />
          </div>
          <div className="login-title">PARKSYS</div>
          <div className="login-sub">Sistema de Gestão de Estacionamento</div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {apiError && (
            <div className="overdue-alert mb-16">
              <AlertCircle size={16} />
              {apiError}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Usuário</label>
            <input
              className={`form-input ${errors.username ? 'error' : ''}`}
              placeholder="seu.usuario"
              autoComplete="username"
              autoCapitalize="none"
              {...register('username', { required: 'Usuário obrigatório', maxLength: { value: 50, message: 'Máximo 50 caracteres' } })}
            />
            {errors.username && (
              <span className="form-error"><AlertCircle size={12} />{errors.username.message}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                className={`form-input ${errors.password ? 'error' : ''}`}
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
                {...register('password', { required: 'Senha obrigatória', maxLength: { value: 128, message: 'Senha muito longa' } })}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  padding: 0,
                }}
                aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <span className="form-error"><AlertCircle size={12} />{errors.password.message}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-xl w-full"
            disabled={isSubmitting}
            style={{ marginTop: 8 }}
          >
            {isSubmitting ? (
              <><div className="spinner" style={{ width: 18, height: 18 }} /> Entrando…</>
            ) : 'ENTRAR'}
          </button>
        </form>
      </div>
    </div>
  )
}
