import type { SubscriberStatus } from '../types'

const LABELS: Record<string, string> = {
  active: 'Ativo',
  overdue: 'Inadimplente',
  inactive: 'Desativado',
  regular: 'Avulso',
  subscriber: 'Mensalista',
  admin: 'Admin',
  operator: 'Operador',
}

interface StatusBadgeProps {
  status: SubscriberStatus | 'regular' | 'subscriber' | 'admin' | 'operator' | string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`badge badge-${status}`}>{LABELS[status] ?? status}</span>
}
