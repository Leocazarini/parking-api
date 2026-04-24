import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncConnection

from src.auth.exceptions import (
    AccountLockedError,
    InvalidCredentialsError,
    InvalidTokenError,
)
from src.auth.tables import revoked_token, user_table
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
    if not user:
        raise InvalidCredentialsError()

    locked_until = user.get("locked_until")
    if locked_until is not None:
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        if now < locked_until:
            seconds_remaining = int((locked_until - now).total_seconds())
            raise AccountLockedError(seconds_remaining)

    if not verify_password(password, user["hashed_password"]):
        new_attempts = user["failed_login_attempts"] + 1
        updates: dict = {"failed_login_attempts": new_attempts}
        if new_attempts >= 5:
            updates["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=15)
        await conn.execute(
            update(user_table).where(user_table.c.id == user["id"]).values(**updates)
        )
        raise InvalidCredentialsError()

    await conn.execute(
        update(user_table)
        .where(user_table.c.id == user["id"])
        .values(failed_login_attempts=0, locked_until=None)
    )
    return (await get_user_by_id(conn, user["id"])) or user


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

    # Reuse detection: if JTI is in blocklist, token was already consumed
    in_blocklist = (
        await conn.execute(select(revoked_token).where(revoked_token.c.jti == jti))
    ).first()
    if in_blocklist:
        # Blocklist whichever token the user currently holds as well (revoke all)
        current_user = await get_user_by_id(conn, user_id)
        if current_user and current_user.get("refresh_token_jti"):
            current_jti = current_user["refresh_token_jti"]
            expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
            await conn.execute(
                revoked_token.insert().values(jti=current_jti, expires_at=expires_at)
            )
        await conn.execute(
            update(user_table)
            .where(user_table.c.id == user_id)
            .values(refresh_token_jti=None)
        )
        raise InvalidTokenError()

    user = await get_user_by_id(conn, user_id)
    if not user or not user["is_active"]:
        raise InvalidTokenError()
    if user["refresh_token_jti"] != jti:
        raise InvalidTokenError()

    # Add current JTI to blocklist before issuing new pair
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    await conn.execute(
        revoked_token.insert().values(jti=jti, expires_at=expires_at)
    )

    return await issue_tokens(conn, user)


async def revoke_refresh_token(conn: AsyncConnection, user_id: int) -> None:
    user = await get_user_by_id(conn, user_id)
    if user and user.get("refresh_token_jti"):
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        await conn.execute(
            revoked_token.insert().values(
                jti=user["refresh_token_jti"], expires_at=expires_at
            )
        )
    await conn.execute(
        update(user_table).where(user_table.c.id == user_id).values(refresh_token_jti=None)
    )


async def purge_revoked_tokens(conn: AsyncConnection) -> int:
    result = await conn.execute(
        delete(revoked_token).where(
            revoked_token.c.expires_at < datetime.now(timezone.utc)
        )
    )
    return result.rowcount
