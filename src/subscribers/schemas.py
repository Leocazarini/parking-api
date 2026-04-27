import re
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator

from src.parking.schemas import PLATE_MERCOSUL, PLATE_OLD, PaymentMethod

_EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')
_ZIP_DIGITS_RE = re.compile(r'^\d{8}$')
_STATE_RE = re.compile(r'^[A-Z]{2}$')


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

    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Nome obrigatório")
        if len(v) > 255:
            raise ValueError("Nome muito longo (máx. 255 caracteres)")
        return v

    @field_validator("cpf", mode="before")
    @classmethod
    def validate_cpf(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) != 11:
            raise ValueError("CPF deve ter exatamente 11 dígitos")
        return digits

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        digits = re.sub(r"\D", "", v)
        if len(digits) not in (10, 11):
            raise ValueError("Telefone deve ter 10 ou 11 dígitos")
        return v

    @field_validator("email", mode="before")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("E-mail inválido")
        return v

    @field_validator("due_day")
    @classmethod
    def validate_due_day(cls, v: int) -> int:
        if not 1 <= v <= 31:
            raise ValueError("Dia de vencimento deve estar entre 1 e 31")
        return v

    @field_validator("zip_code", mode="before")
    @classmethod
    def validate_zip_code(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        digits = re.sub(r"\D", "", v)
        if not _ZIP_DIGITS_RE.match(digits):
            raise ValueError("CEP deve ter 8 dígitos")
        return f"{digits[:5]}-{digits[5:]}"

    @field_validator("state", mode="before")
    @classmethod
    def validate_state(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip().upper()
        if not _STATE_RE.match(v):
            raise ValueError("Estado (UF) deve ter 2 letras. Ex: SP")
        return v

    @field_validator("street", "neighborhood", "city", mode="before")
    @classmethod
    def validate_address_medium(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip()
        if len(v) > 255:
            raise ValueError("Campo muito longo (máx. 255 caracteres)")
        return v

    @field_validator("number", mode="before")
    @classmethod
    def validate_number(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip()
        if len(v) > 10:
            raise ValueError("Número muito longo (máx. 10 caracteres)")
        return v

    @field_validator("complement", mode="before")
    @classmethod
    def validate_complement(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip()
        if len(v) > 100:
            raise ValueError("Complemento muito longo (máx. 100 caracteres)")
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

    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip()
        if len(v) > 255:
            raise ValueError("Nome muito longo (máx. 255 caracteres)")
        return v

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        digits = re.sub(r"\D", "", v)
        if len(digits) not in (10, 11):
            raise ValueError("Telefone deve ter 10 ou 11 dígitos")
        return v

    @field_validator("email", mode="before")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("E-mail inválido")
        return v

    @field_validator("due_day")
    @classmethod
    def validate_due_day(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not 1 <= v <= 31:
            raise ValueError("Dia de vencimento deve estar entre 1 e 31")
        return v

    @field_validator("zip_code", mode="before")
    @classmethod
    def validate_zip_code(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        digits = re.sub(r"\D", "", v)
        if not _ZIP_DIGITS_RE.match(digits):
            raise ValueError("CEP deve ter 8 dígitos")
        return f"{digits[:5]}-{digits[5:]}"

    @field_validator("state", mode="before")
    @classmethod
    def validate_state(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip().upper()
        if not _STATE_RE.match(v):
            raise ValueError("Estado (UF) deve ter 2 letras. Ex: SP")
        return v


class SubscriberResponse(BaseModel):
    id: int
    name: str
    cpf: str
    phone: Optional[str] = None
    email: Optional[str] = None
    status: str
    is_active: bool
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
            raise ValueError("Placa inválida. Use ABC1234 ou ABC1D23")
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

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Valor deve ser maior que zero")
        if v > Decimal("99999.99"):
            raise ValueError("Valor muito alto")
        return v

    @field_validator("notes", mode="before")
    @classmethod
    def validate_notes(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip()
        if len(v) > 500:
            raise ValueError("Observação muito longa (máx. 500 caracteres)")
        return v


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
