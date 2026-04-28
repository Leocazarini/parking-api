from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class ByPaymentMethod(BaseModel):
    dinheiro: Decimal
    credito: Decimal
    debito: Decimal
    pix: Decimal


class ByClientType(BaseModel):
    regular: Decimal
    subscriber: Decimal


class RevenueResponse(BaseModel):
    total: Decimal
    by_payment_method: ByPaymentMethod
    by_client_type: ByClientType
    entries_count: int
    subscriber_payments_count: int
    average_duration_minutes: float


class DailyRevenueItem(BaseModel):
    date: date
    total: Decimal
    entries_count: int


class ParkingSummaryResponse(BaseModel):
    total_entries: int
    regular_entries: int
    subscriber_entries: int
    free_exits: int
    average_stay_minutes: float
    regular_average_stay_minutes: float
    peak_hour: Optional[int]


class SubscriberRevenueResponse(BaseModel):
    total_received: Decimal
    payments_count: int
    overdue_count: int


class HourlyRevenueItem(BaseModel):
    hour: int
    today: Decimal
    yesterday: Decimal


class OverdueSubscriberItem(BaseModel):
    id: int
    name: str
    cpf: str
    phone: Optional[str]
    email: Optional[str]
    due_day: int


class MonthPaymentItem(BaseModel):
    subscriber_id: int
    subscriber_name: str
    amount: Decimal
    payment_method: str
    payment_date: date
    notes: Optional[str] = None
