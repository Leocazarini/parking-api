from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncConnection

from src.auth.service import hash_password
from src.auth.tables import user_table
from src.users.exceptions import (
    DuplicateEmailError,
    DuplicateUsernameError,
    UserNotFoundError,
)


async def list_users(conn: AsyncConnection) -> list[dict]:
    rows = (
        await conn.execute(select(user_table).order_by(user_table.c.username))
    ).fetchall()
    return [dict(r._mapping) for r in rows]


async def create_user(conn: AsyncConnection, data: dict) -> dict:
    if (await conn.execute(
        select(user_table).where(user_table.c.username == data["username"])
    )).first():
        raise DuplicateUsernameError(data["username"])

    if (await conn.execute(
        select(user_table).where(user_table.c.email == data["email"])
    )).first():
        raise DuplicateEmailError(data["email"])

    result = await conn.execute(
        user_table.insert().values(
            username=data["username"],
            email=data["email"],
            hashed_password=hash_password(data["password"]),
            role=data.get("role", "operator"),
            is_active=True,
        )
    )
    return await get_user(conn, result.inserted_primary_key[0])


async def get_user(conn: AsyncConnection, user_id: int) -> dict:
    row = (
        await conn.execute(select(user_table).where(user_table.c.id == user_id))
    ).first()
    if not row:
        raise UserNotFoundError(user_id)
    return dict(row._mapping)


async def update_user(conn: AsyncConnection, user_id: int, data: dict) -> dict:
    await get_user(conn, user_id)
    fields = {k: v for k, v in data.items() if v is not None}
    if fields:
        await conn.execute(
            update(user_table).where(user_table.c.id == user_id).values(**fields)
        )
    return await get_user(conn, user_id)


async def deactivate_user(conn: AsyncConnection, user_id: int) -> None:
    await get_user(conn, user_id)
    await conn.execute(
        update(user_table).where(user_table.c.id == user_id).values(is_active=False)
    )
