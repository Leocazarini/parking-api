import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToast } from '../hooks/useToast'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const Icon = icons[t.type]
        return (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            onClick={() => dismiss(t.id)}
          >
            <Icon size={16} />
            <span style={{ flex: 1 }}>{t.message}</span>
            <X size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
          </div>
        )
      })}
    </div>
  )
}
