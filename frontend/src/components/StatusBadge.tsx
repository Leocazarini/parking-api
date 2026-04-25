import type { SubscriberStatus } from '../types'

const LABELS: Record<string, string> = {
  active: 'Ativo',
  overdue: 'Inadimplente',
  suspended: 'Suspenso',
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
