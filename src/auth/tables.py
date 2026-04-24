from sqlalchemy import TIMESTAMP, Boolean, Column, Integer, String, Table, Text, func

from src.database import metadata

user_table = Table(
    "user",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("username", String(50), nullable=False, unique=True),
    Column("email", String(255), nullable=False, unique=True),
    Column("hashed_password", Text, nullable=False),
    Column("role", String(12), nullable=False, server_default="operator"),
    Column("is_active", Boolean, nullable=False, server_default="true"),
    Column("created_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
    Column("refresh_token_jti", String(36), nullable=True),
    Column("failed_login_attempts", Integer, nullable=False, server_default="0"),
    Column("locked_until", TIMESTAMP(timezone=True), nullable=True),
)

revoked_token = Table(
    "revoked_token",
    metadata,
    Column("jti", String(36), primary_key=True),
    Column("revoked_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
    Column("expires_at", TIMESTAMP(timezone=True), nullable=False),
)
