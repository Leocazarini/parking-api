import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncConnection

from src.auth.exceptions import InvalidCredentialsError, InvalidTokenError
from src.auth.tables import user_table
from src.config import settings


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(user_id: int, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "jti": str(uuid.uuid4()),
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALG)


def create_refresh_token(user_id: int) -> tuple[str, str]:
    jti = str(uuid.uuid4())
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "type": "refresh", "jti": jti, "exp": expire}
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALG)
    return token, jti


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALG])
    except JWTError:
        raise InvalidTokenError()


async def get_user_by_id(conn: AsyncConnection, user_id: int) -> dict | None:
    result = await conn.execute(select(user_table).where(user_table.c.id == user_id))
    row = result.first()
    return dict(row._mapping) if row else None


async def get_user_by_username(conn: AsyncConnection, username: str) -> dict | None:
    result = await conn.execute(
        select(user_table).where(user_table.c.username == username)
    )
    row = result.first()
    return dict(row._mapping) if row else None


async def authenticate(conn: AsyncConnection, username: str, password: str) -> dict:
    user = await get_user_by_username(conn, username)
    if not user or not verify_password(password, user["hashed_password"]):
        raise InvalidCredentialsError()
    return user


async def issue_tokens(conn: AsyncConnection, user: dict) -> dict:
    access_token = create_access_token(user["id"], user["role"])
    refresh_token, jti = create_refresh_token(user["id"])
    await conn.execute(
        update(user_table).where(user_table.c.id == user["id"]).values(refresh_token_jti=jti)
    )
    return {"access_token": access_token, "refresh_token": refresh_token}


async def refresh_tokens(conn: AsyncConnection, refresh_token: str) -> dict:
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise InvalidTokenError()

    user_id = int(payload["sub"])
    jti = payload.get("jti")

    user = await get_user_by_id(conn, user_id)
    if not user or not user["is_active"]:
        raise InvalidTokenError()
    if user["refresh_token_jti"] != jti:
        raise InvalidTokenError()

    return await issue_tokens(conn, user)


async def revoke_refresh_token(conn: AsyncConnection, user_id: int) -> None:
    await conn.execute(
        update(user_table).where(user_table.c.id == user_id).values(refresh_token_jti=None)
    )
