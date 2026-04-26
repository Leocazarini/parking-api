export interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'operator'
  is_active: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface ActiveEntry {
  id: number
  plate: string
  color: string
  model: string | null
  client_type: 'regular' | 'subscriber'
  entry_at: string
  subscriber_status?: string | null
  subscriber_name?: string | null
}

export interface EntryResponse {
  id: number
  plate: string
  color_id: number
  model_id: number | null
  client_type: string
  entry_at: string
  exit_at: string | null
  amount_charged: string | null
  payment_method: string | null
  operator_id: number | null
  subscriber_status: string | null
  subscriber_name: string | null
}

export interface ExitResponse {
  id: number
  plate: string
  entry_at: string
  exit_at: string
  amount_charged: string
  payment_method: string
}

export interface ParkingConfig {
  hourly_rate: string
  daily_rate: string
  tolerance_minutes: number
}

export interface Color {
  id: number
  name: string
}

export interface VehicleModel {
  id: number
  name: string
}

export type SubscriberStatus = 'active' | 'overdue'
export type PaymentMethod = 'dinheiro' | 'credito' | 'debito' | 'pix'

export interface Subscriber {
  id: number
  name: string
  cpf: string
  phone: string | null
  email: string | null
  status: SubscriberStatus
  is_active: boolean
  due_day: number
  zip_code: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  created_at: string
}

export interface SubscriberVehicle {
  id: number
  subscriber_id: number
  plate: string
  model_id: number | null
  color_id: number | null
  created_at: string
}

export interface SubscriberPayment {
  id: number
  subscriber_id: number
  amount: string
  reference_month: string
  payment_date: string
  payment_method: PaymentMethod
  notes: string | null
  created_at: string
}

export interface SubscriberDetail extends Subscriber {
  vehicles: SubscriberVehicle[]
  payments: SubscriberPayment[]
}

export interface RevenueResponse {
  total: string
  by_payment_method: {
    dinheiro: string
    credito: string
    debito: string
    pix: string
  }
  by_client_type: {
    regular: string
    subscriber: string
  }
  entries_count: number
  subscriber_payments_count: number
  average_duration_minutes: number
}

export interface DailyRevenueItem {
  date: string
  total: string
  entries_count: number
}

export interface ParkingSummary {
  total_entries: number
  regular_entries: number
  subscriber_entries: number
  free_exits: number
  average_stay_minutes: number
  peak_hour: number | null
}

export interface SubscriberRevenue {
  total_received: string
  payments_count: number
  overdue_count: number
}

export interface HourlyRevenueItem {
  hour: number
  today: string
  yesterday: string
}

export interface YardUpdate {
  occupied: number
  vehicles: ActiveEntry[]
}
