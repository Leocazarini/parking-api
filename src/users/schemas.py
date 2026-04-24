from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str = "operator"

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("admin", "operator"):
            raise ValueError("role deve ser 'admin' ou 'operator'")
        return v


class UserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("admin", "operator"):
            raise ValueError("role deve ser 'admin' ou 'operator'")
        return v


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
