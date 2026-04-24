import re
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Optional

from pydantic import BaseModel, field_validator

PLATE_MERCOSUL = re.compile(r"^[A-Z]{3}[0-9][A-Z][0-9]{2}$")
PLATE_OLD = re.compile(r"^[A-Z]{3}[0-9]{4}$")


class PaymentMethod(StrEnum):
    DINHEIRO = "dinheiro"
    CREDITO = "credito"
    DEBITO = "debito"
    PIX = "pix"


class EntryCreate(BaseModel):
    placa: str
    color_id: int

    @field_validator("placa", mode="before")
    @classmethod
    def validate_placa(cls, v: str) -> str:
        plate = v.upper().strip()
        if not (PLATE_MERCOSUL.match(plate) or PLATE_OLD.match(plate)):
            raise ValueError("Placa inválida. Use AAA0000 ou AAA0A00")
        return plate


class ExitCreate(BaseModel):
    entry_id: int
    payment_method: PaymentMethod


class ActiveEntryResponse(BaseModel):
    id: int
    plate: str
    color: str
    model: Optional[str] = None
    client_type: str
    entry_at: datetime


class EntryResponse(BaseModel):
    id: int
    plate: str
    color_id: int
    model_id: Optional[int] = None
    client_type: str
    entry_at: datetime
    exit_at: Optional[datetime] = None
    amount_charged: Optional[Decimal] = None
    payment_method: Optional[str] = None
    operator_id: Optional[int] = None


class ExitResponse(BaseModel):
    id: int
    plate: str
    entry_at: datetime
    exit_at: datetime
    amount_charged: Decimal
    payment_method: str


class ConfigResponse(BaseModel):
    hourly_rate: Decimal
    daily_rate: Decimal
    tolerance_minutes: int


class ConfigUpdate(BaseModel):
    hourly_rate: Optional[Decimal] = None
    daily_rate: Optional[Decimal] = None
    tolerance_minutes: Optional[int] = None
