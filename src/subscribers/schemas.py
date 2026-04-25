import re
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator

from src.parking.schemas import PLATE_MERCOSUL, PLATE_OLD, PaymentMethod


class SubscriberCreate(BaseModel):
    name: str
    cpf: str
    phone: Optional[str] = None
    email: Optional[str] = None
    due_day: int
    zip_code: Optional[str] = None
    street: Optional[str] = None
    number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None

    @field_validator("cpf", mode="before")
    @classmethod
    def validate_cpf(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) != 11:
            raise ValueError("CPF deve ter 11 dígitos")
        return digits

    @field_validator("due_day")
    @classmethod
    def validate_due_day(cls, v: int) -> int:
        if not 1 <= v <= 28:
            raise ValueError("due_day deve estar entre 1 e 28")
        return v


class SubscriberUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    due_day: Optional[int] = None
    zip_code: Optional[str] = None
    street: Optional[str] = None
    number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None

    @field_validator("due_day")
    @classmethod
    def validate_due_day(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not 1 <= v <= 28:
            raise ValueError("due_day deve estar entre 1 e 28")
        return v


class SubscriberResponse(BaseModel):
    id: int
    name: str
    cpf: str
    phone: Optional[str] = None
    email: Optional[str] = None
    status: str
    due_day: int
    zip_code: Optional[str] = None
    street: Optional[str] = None
    number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    created_at: datetime


class VehicleCreate(BaseModel):
    plate: str
    model_id: Optional[int] = None
    color_id: Optional[int] = None

    @field_validator("plate", mode="before")
    @classmethod
    def validate_plate(cls, v: str) -> str:
        plate = v.upper().strip()
        if not (PLATE_MERCOSUL.match(plate) or PLATE_OLD.match(plate)):
            raise ValueError("Placa inválida. Use AAA0000 ou AAA0A00")
        return plate


class VehicleResponse(BaseModel):
    id: int
    subscriber_id: int
    plate: str
    model_id: Optional[int] = None
    color_id: Optional[int] = None
    created_at: datetime


class PaymentCreate(BaseModel):
    amount: Decimal
    reference_month: date
    payment_date: date
    payment_method: PaymentMethod
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    subscriber_id: int
    amount: Decimal
    reference_month: date
    payment_date: date
    payment_method: str
    notes: Optional[str] = None
    created_at: datetime


class SubscriberDetail(SubscriberResponse):
    vehicles: list[VehicleResponse] = []
    payments: list[PaymentResponse] = []


class OverdueJobResponse(BaseModel):
    checked: int
    marked_overdue: int
